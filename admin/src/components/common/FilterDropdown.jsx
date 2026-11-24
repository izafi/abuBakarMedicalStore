import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const FilterDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  align = 'left', // 'left' | 'right'
  disabled = false,
  icon = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-9 px-2.5 sm:px-3 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black font-bold flex items-center justify-between gap-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-75 disabled:bg-slate-100 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-600 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu - bounded to viewport with max-height and custom scrollbar */}
          <div
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } mt-1 w-full min-w-[150px] sm:min-w-[170px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 max-h-52 sm:max-h-56 overflow-y-auto overscroll-contain`}
          >
            {options.map((opt, idx) => {
              if (opt.isHeader) {
                return (
                  <div
                    key={idx}
                    className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-y border-slate-100 first:border-t-0 select-none"
                  >
                    {opt.label}
                  </div>
                );
              }
              const isSelected = opt.value === value;
              const isAction = opt.isAction || opt.value === '__ADD_NEW__';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-[#1C9A58] font-bold'
                      : isAction
                      ? 'text-[#1C9A58] font-bold hover:bg-emerald-50'
                      : 'text-slate-800 hover:bg-slate-50 hover:text-black font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1C9A58] shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default FilterDropdown;
