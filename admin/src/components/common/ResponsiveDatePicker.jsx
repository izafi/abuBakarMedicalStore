import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

export const formatDateToISO = (year, month, day) => {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
};

export const parseISODate = (val) => {
  if (!val || typeof val !== 'string') return new Date();
  const parts = val.split('-');
  if (parts.length < 3) return new Date();
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
  return new Date(y, m - 1, d);
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ResponsiveDatePicker = ({
  value = '',
  onChange,
  name = '',
  placeholder = 'Select date',
  className = '',
  inputClassName = '',
  align = 'left', // 'left' | 'right'
  quickPresets = true,
  disabled = false,
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false, isMobile: false });

  // Active selection
  const selectedDate = useMemo(() => (value ? parseISODate(value) : null), [value]);

  // Calendar viewing state
  const [viewDate, setViewDate] = useState(() => (selectedDate ? new Date(selectedDate) : new Date()));

  useEffect(() => {
    if (value) {
      setViewDate(parseISODate(value));
    }
  }, [value]);

  // Calculate coordinates to float outside the modal DOM tree
  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setCoords({ top: 0, left: 0, openUpward: false, isMobile: true });
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 310;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popoverHeight + 10 && rect.top > popoverHeight;

    let top = openUpward ? rect.top - popoverHeight - 6 : rect.bottom + 6;
    let left = align === 'right' ? rect.right - popoverWidth : rect.left;

    // Boundary containment
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({ top, left, openUpward, isMobile: false });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      calculatePosition();
      const onReposition = () => calculatePosition();
      window.addEventListener('resize', onReposition);
      window.addEventListener('scroll', onReposition, true);
      return () => {
        window.removeEventListener('resize', onReposition);
        window.removeEventListener('scroll', onReposition, true);
      };
    }
  }, [isOpen, align]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleYearChange = (e) => {
    setViewDate(new Date(Number(e.target.value), viewMonth, 1));
  };

  const handleMonthChange = (e) => {
    setViewDate(new Date(viewYear, Number(e.target.value), 1));
  };

  const emitChange = (isoString) => {
    if (onChange) {
      onChange({
        target: { name, value: isoString },
      });
    }
    setIsOpen(false);
  };

  const handleSelectDay = (day, offsetMonth = 0) => {
    const targetMonth = viewMonth + offsetMonth;
    const targetDate = new Date(viewYear, targetMonth, day);
    const iso = formatDateToISO(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    emitChange(iso);
  };

  const applyPreset = (presetType) => {
    const now = new Date();
    let target = new Date();
    if (presetType === 'today') {
      target = now;
    } else if (presetType === '+1year') {
      target = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else if (presetType === '+2years') {
      target = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    } else if (presetType === '+3years') {
      target = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
    }
    const iso = formatDateToISO(target.getFullYear(), target.getMonth(), target.getDate());
    emitChange(iso);
  };

  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, offsetMonth: -1 });
    }
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, offsetMonth: 0 });
    }
    const remaining = (firstDayIndex + daysInCurrentMonth) % 7;
    const nextDaysCount = remaining > 0 ? 7 - remaining : 0;
    for (let d = 1; d <= nextDaysCount; d++) {
      cells.push({ day: d, isCurrentMonth: false, offsetMonth: 1 });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const years = [];
    const currentY = new Date().getFullYear();
    for (let y = currentY - 5; y <= currentY + 12; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const displayFormattedDate = useMemo(() => {
    if (!value) return '';
    try {
      const d = parseISODate(value);
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
    } catch {
      return value;
    }
  }, [value]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return formatDateToISO(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-9 px-2.5 sm:px-3 text-xs font-bold bg-white border rounded-lg text-slate-900 flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
          error
            ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
            : isOpen
            ? 'border-[#1C9A58] ring-1 ring-[#1C9A58]/30'
            : 'border-slate-300 hover:border-slate-400 focus:border-[#1C9A58]'
        } ${inputClassName}`}
      >
        <span className={displayFormattedDate ? 'text-slate-900 font-mono font-bold' : 'text-slate-400 font-normal'}>
          {displayFormattedDate || placeholder}
        </span>
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </button>

      {/* Floating Popover rendered outside modal DOM tree via portal */}
      {isOpen &&
        createPortal(
          <>
            {/* Mobile Backdrop */}
            {coords.isMobile && (
              <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-[9998]"
                onClick={() => setIsOpen(false)}
              />
            )}

            {/* Calendar Popover */}
            <div
              ref={popoverRef}
              style={
                coords.isMobile
                  ? undefined
                  : {
                      position: 'fixed',
                      top: `${coords.top}px`,
                      left: `${coords.left}px`,
                    }
              }
              className={`
                z-[9999] select-none
                ${
                  coords.isMobile
                    ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px]'
                    : 'w-[280px]'
                }
                bg-white rounded-2xl sm:rounded-xl shadow-2xl border border-slate-200 p-3
              `}
            >
              {/* Header: Month & Year Selectors + Nav Arrows */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-black cursor-pointer transition-colors shrink-0"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 min-w-0">
                  <select
                    value={viewMonth}
                    onChange={handleMonthChange}
                    className="text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-1 cursor-pointer focus:outline-none"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewYear}
                    onChange={handleYearChange}
                    className="text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-1 cursor-pointer focus:outline-none"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 hover:text-black cursor-pointer transition-colors shrink-0"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Presets */}
              {quickPresets && (
                <div className="flex items-center justify-between gap-1 py-1.5 border-b border-slate-100 text-[10px]">
                  <button
                    type="button"
                    onClick={() => applyPreset('today')}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('+1year')}
                    className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#1C9A58] border border-emerald-200 font-bold transition-colors cursor-pointer"
                  >
                    +1 Yr
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('+2years')}
                    className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#1C9A58] border border-emerald-200 font-bold transition-colors cursor-pointer"
                  >
                    +2 Yrs
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('+3years')}
                    className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-[#1C9A58] border border-emerald-200 font-bold transition-colors cursor-pointer"
                  >
                    +3 Yrs
                  </button>
                </div>
              )}

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center pt-2 pb-1 text-[11px] font-bold text-slate-400">
                {DAY_NAMES.map((d, i) => (
                  <div key={i} className="h-5 flex items-center justify-center">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarCells.map((cell, idx) => {
                  const targetDate = new Date(viewYear, viewMonth + cell.offsetMonth, cell.day);
                  const iso = formatDateToISO(
                    targetDate.getFullYear(),
                    targetDate.getMonth(),
                    targetDate.getDate()
                  );
                  const isSelected = iso === value;
                  const isToday = iso === todayIso;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(cell.day, cell.offsetMonth)}
                      className={`
                        h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold
                        transition-all cursor-pointer
                        ${
                          isSelected
                            ? 'bg-[#1C9A58] text-white font-bold shadow-xs scale-105'
                            : isToday
                            ? 'border border-[#1C9A58] text-[#1C9A58] font-bold hover:bg-emerald-50'
                            : cell.isCurrentMonth
                            ? 'text-slate-800 hover:bg-slate-100 font-medium'
                            : 'text-slate-300 hover:bg-slate-50'
                        }
                      `}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => emitChange('')}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-[#1C9A58] hover:text-[#158046] px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default ResponsiveDatePicker;
