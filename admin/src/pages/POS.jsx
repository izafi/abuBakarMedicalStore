import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Trash2,
  Printer,
  FileText,
  Save,
  Calendar,
  UserCheck,
  Building,
  User,
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { InvoiceModal } from '../components/common/InvoiceModal';
import { ResponsiveDatePicker } from '../components/common/ResponsiveDatePicker';
import { FilterDropdown } from '../components/common/FilterDropdown';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { salesService } from '../services/salesService';
import { employeeService } from '../services/employeeService';
import { formatCurrency } from '../utils/formatters';

const STANDARD_BUYER_PRESETS = [
  'Walk-in Customer',
  'Regular Patient',
  'Emergency / Casualty',
  'Doctor Prescription Order',
  'Hospital / Clinic Supply',
  'Wholesale / Retail Buyer',
  'Staff / Internal Dispense',
];

const createEmptyRow = (id = Date.now()) => ({
  rowId: String(id),
  selectedMedicineId: '',
  selectedBatchId: '',
  productQuery: '',
  isSearchOpen: false,
  pack: 'Tablet',
  pcs: '1',
  qty: 1,
  stock: 0,
  price: 0,
  discPercent: 0,
  discAmount: 0,
  amount: 0,
  purchasePrice: 0,
  medicine: null,
  batch: null,
});

// Subtle Web Audio POS terminal feedback beep
const playPosBeep = (freq = 750, duration = 0.08) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext blocked or not supported
  }
};

// Helper: Highlight matching letters/substrings in suggestion list
const highlightMatch = (text = '', query = '') => {
  if (!text) return '';
  const cleanQ = query.trim();
  if (!cleanQ) return text;

  const terms = cleanQ.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  try {
    const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-[#1C9A58] bg-emerald-100/80 px-0.5 rounded font-black">
          {part}
        </span>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
};

/**
 * ProductSearchCell
 * Real-time reactive suggestion on every single letter change.
 * Portals directly outside the table so it is never clipped.
 * Supports full keyboard navigation (ArrowUp, ArrowDown, Enter, Esc) and audio feedback.
 */
const ProductSearchCell = ({
  row,
  rowIndex,
  rowsCount,
  medicines,
  sellableBatchesMap,
  updateRowField,
  handleSelectProduct,
  onNavigateGrid,
  onEnterNewRow,
}) => {
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [stylePos, setStylePos] = useState({
    position: 'fixed',
    top: '0px',
    left: '0px',
    width: '340px',
    zIndex: 9999,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const isMobileOrTablet = window.innerWidth < 1024;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const fitsBelow = spaceBelow >= 150 || spaceBelow >= spaceAbove;

      const newStyle = {
        position: 'fixed',
        zIndex: 9999,
      };

      // Vertical positioning: attach immediately below or above the input, strictly bounded within viewport
      if (fitsBelow) {
        newStyle.top = `${rect.bottom + 4}px`;
        newStyle.bottom = 'auto';
        newStyle.maxHeight = `${Math.max(80, Math.min(260, spaceBelow - 16))}px`;
      } else {
        newStyle.bottom = `${Math.max(8, window.innerHeight - rect.top + 4)}px`;
        newStyle.top = 'auto';
        newStyle.maxHeight = `${Math.max(80, Math.min(260, spaceAbove - 16))}px`;
      }

      // Horizontal positioning: strictly screen-bounded for mobiles, tabs and small screens
      if (isMobileOrTablet) {
        newStyle.left = '12px';
        newStyle.right = '12px';
        newStyle.width = 'auto';
        newStyle.maxWidth = 'calc(100vw - 24px)';
        newStyle.boxSizing = 'border-box';
      } else {
        const desiredWidth = Math.max(340, rect.width);
        const maxLeft = Math.max(12, window.innerWidth - desiredWidth - 16);
        newStyle.left = `${Math.max(12, Math.min(rect.left, maxLeft))}px`;
        newStyle.right = 'auto';
        newStyle.width = `${Math.min(desiredWidth, window.innerWidth - 24)}px`;
        newStyle.maxWidth = 'calc(100vw - 24px)';
        newStyle.boxSizing = 'border-box';
      }

      setStylePos(newStyle);
    }
  };

  useEffect(() => {
    if (!row.isSearchOpen) return;
    updateCoords();

    const handleScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [row.isSearchOpen]);

  // Instant reactive matching on every single letter change (only when typing)
  const filteredMedicines = useMemo(() => {
    const raw = (row.productQuery || '').trim().toLowerCase();
    if (!raw) return [];

    const terms = raw.split(/\s+/).filter(Boolean);
    const matches = [];

    medicines.forEach((med) => {
      const name = (med.name || '').toLowerCase();
      const generic = (med.genericName || '').toLowerCase();
      const code = (med.medicineId || '').toLowerCase();
      const formula = (med.formula || '').toLowerCase();
      const strength = (med.strength || '').toLowerCase();
      const medId = med.medicineId || med.id || med._id;
      const bList = sellableBatchesMap[medId] || [];
      const batchNumbers = bList.map((b) => (b.batchNumber || b.batchNo || '').toLowerCase());

      const matchesAllTerms = terms.every((term) => {
        return (
          name.includes(term) ||
          generic.includes(term) ||
          code.includes(term) ||
          formula.includes(term) ||
          strength.includes(term) ||
          batchNumbers.some((bNo) => bNo.includes(term))
        );
      });

      if (matchesAllTerms) {
        let score = 0;
        // Prioritize starting letter matches
        if (name.startsWith(raw)) score += 100;
        else if (name.includes(raw)) score += 50;
        if (code.startsWith(raw)) score += 80;
        if (generic.startsWith(raw)) score += 40;
        else if (generic.includes(raw)) score += 20;

        matches.push({ med, score });
      }
    });

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 20).map((m) => m.med);
  }, [medicines, row.productQuery, sellableBatchesMap]);

  // Reset selectedIndex whenever query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [row.productQuery]);

  // Auto scroll active suggestion into view
  useEffect(() => {
    if (dropdownRef.current && row.isSearchOpen) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, row.isSearchOpen]);

  // Full keyboard navigation
  const handleKeyDown = (e) => {
    const hasQuery = (row.productQuery || '').trim().length > 0;

    // 1. If suggestion dropdown is open with matches:
    if (row.isSearchOpen && hasQuery && filteredMedicines.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMedicines.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMedicines.length) % filteredMedicines.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredMedicines[selectedIndex]) {
          playPosBeep(850, 0.08);
          // Enter selects product AND automatically enters the new medicine line
          handleSelectProduct(row.rowId, filteredMedicines[selectedIndex], null, true);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        updateRowField(row.rowId, 'isSearchOpen', false);
        return;
      }
    }

    // 2. When dropdown is closed or empty:
    if (e.key === 'Enter') {
      e.preventDefault();
      // If dropdown is open and there's a match, pick it
      if (row.isSearchOpen && filteredMedicines.length > 0 && filteredMedicines[selectedIndex]) {
        playPosBeep(850, 0.08);
        handleSelectProduct(row.rowId, filteredMedicines[selectedIndex], null, true);
      } else {
        // Otherwise pressing Enter enters the new medicine row directly!
        if (onEnterNewRow) {
          onEnterNewRow(rowIndex);
        }
      }
      return;
    }

    // 3. Arrow Navigation throughout the grid
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (onNavigateGrid) {
        onNavigateGrid(rowIndex, 0, 'down');
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (onNavigateGrid) {
        onNavigateGrid(rowIndex, 0, 'up');
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      const isAtEnd =
        inputRef.current &&
        (inputRef.current.selectionEnd === (row.productQuery || '').length ||
          inputRef.current.selectionStart === inputRef.current.selectionEnd);
      if (isAtEnd || !row.isSearchOpen) {
        e.preventDefault();
        if (onNavigateGrid) {
          onNavigateGrid(rowIndex, 0, 'right');
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      const isAtStart = inputRef.current && inputRef.current.selectionStart === 0;
      if (isAtStart && rowIndex > 0) {
        e.preventDefault();
        if (onNavigateGrid) {
          onNavigateGrid(rowIndex, 0, 'left');
        }
      }
      return;
    }
  };

  return (
    <td className="py-2 px-2.5 relative">
      <input
        ref={inputRef}
        data-pos-row={rowIndex}
        data-pos-col={0}
        type="text"
        value={row.productQuery}
        onFocus={() => {
          if ((row.productQuery || '').trim().length > 0 && !row.selectedMedicineId) {
            updateCoords();
            updateRowField(row.rowId, 'isSearchOpen', true);
          }
        }}
        onChange={(e) => {
          const val = e.target.value;
          updateCoords();
          updateRowField(row.rowId, 'productQuery', val);
          updateRowField(row.rowId, 'isSearchOpen', val.trim().length > 0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search product, code, or formula..."
        className="w-full h-8 px-2.5 text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-md text-black focus:outline-none focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58] transition-colors"
      />

      {row.isSearchOpen && (row.productQuery || '').trim().length > 0 &&
        createPortal(
          <>
            {/* Backdrop click outside to close */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => updateRowField(row.rowId, 'isSearchOpen', false)}
            />

            {/* Dropdown menu portaled directly to body so it floats outside the table */}
            <div
              ref={dropdownRef}
              style={stylePos}
              className="overflow-y-auto bg-white border border-slate-300 rounded-lg shadow-2xl divide-y divide-slate-100"
            >
              {filteredMedicines.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 font-semibold">
                  No medicines found for "{row.productQuery}"
                </div>
              ) : (
                filteredMedicines.map((med, idx) => {
                  const medId = med.medicineId || med.id || med._id;
                  const bList = sellableBatchesMap[medId] || [];
                  const totalStock = med.availableStock ?? 0;
                  const isSelected = idx === selectedIndex;

                  return (
                    <div
                      key={medId}
                      data-index={idx}
                      onClick={() => {
                        playPosBeep(850, 0.08);
                        handleSelectProduct(row.rowId, med);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-2.5 cursor-pointer transition-colors text-left ${
                        isSelected
                          ? 'bg-emerald-50/95 border-l-4 border-[#1C9A58]'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-black truncate">
                          {highlightMatch(med.name, row.productQuery)}
                        </span>
                        <span className="text-xs font-bold text-[#1C9A58] shrink-0">
                          {formatCurrency(med.sellingPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5 gap-2">
                        <span className="truncate">
                          {highlightMatch(med.genericName, row.productQuery)}
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                            totalStock <= 0
                              ? 'text-rose-700 bg-rose-100'
                              : totalStock < 10
                              ? 'text-amber-800 bg-amber-100'
                              : 'text-emerald-800 bg-emerald-100'
                          }`}
                        >
                          {totalStock} in stock
                        </span>
                      </div>

                      {/* Multi-batch chips */}
                      {bList.length > 1 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold">Batches:</span>
                          {bList.map((b) => (
                            <button
                              key={b.batchId || b.id || b._id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playPosBeep(850, 0.08);
                                handleSelectProduct(row.rowId, med, b);
                              }}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 hover:bg-[#1C9A58] hover:text-white rounded border border-slate-300 transition-colors"
                            >
                              {b.batchNumber || b.batchNo} ({b.quantity})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>,
          document.body
        )}
    </td>
  );
};

export const POS = () => {
  const { medicines, batches, refreshInventory } = useInventory();
  const { cart, clearCart, removeFromCart, recordCompletedSale, refreshSales } = useSales();
  const { currentUser, hasPermission } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const canAddSale = hasPermission('sales', 'add');

  // Top header metadata state
  const [companyName, setCompanyName] = useState('Abu Bakar Medical Store');
  const [buyerName, setBuyerName] = useState('Walk-in Customer');
  const [orderTakenBy, setOrderTakenBy] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Buyer Quick-Add & Dynamic Customer / Employee DB State
  const [isAddBuyerOpen, setIsAddBuyerOpen] = useState(false);
  const [newBuyerInput, setNewBuyerInput] = useState('');
  const [customBuyers, setCustomBuyers] = useState([]);
  const [dbCustomers, setDbCustomers] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);

  // Fetch dynamic customers from previous sales and employees from database
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch recent sales from DB to extract historical customer / patient names
    salesService
      .getSales({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const sales = res?.data?.sales || res?.data || [];
        const pastNames = new Set();
        sales.forEach((s) => {
          const name = (s.patientName || s.customerName || '').trim();
          if (
            name &&
            name.toLowerCase() !== 'walk-in customer' &&
            !STANDARD_BUYER_PRESETS.some((preset) => preset.toLowerCase() === name.toLowerCase())
          ) {
            pastNames.add(name);
          }
        });
        setDbCustomers(Array.from(pastNames));
      })
      .catch((err) => {
        console.warn('[POS] Could not load customer history from DB:', err);
      });

    // 2. Fetch employees from DB
    employeeService
      .getEmployees()
      .then((res) => {
        if (!isMounted) return;
        const emps = res?.data?.employees || res?.data || [];
        if (Array.isArray(emps) && emps.length > 0) {
          setDbEmployees(emps);
        }
      })
      .catch((err) => {
        console.warn('[POS] Could not load employee list from DB:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Table rows state
  const [rows, setRows] = useState([createEmptyRow()]);

  // Synchronize active bill items added from Medicine Counter into POS grid rows
  useEffect(() => {
    if (!cart || cart.length === 0) return;

    setRows((prev) => {
      const isDefaultEmpty =
        prev.length === 1 &&
        !prev[0].selectedMedicineId &&
        !prev[0].productQuery.trim();

      const convertedRows = cart.map((item, idx) => {
        const medId = item.medicineId;
        const med = medicines.find(
          (m) =>
            m.medicineId === medId ||
            m.id === medId ||
            m._id === medId ||
            m.name?.toLowerCase() === item.medicineName?.toLowerCase()
        );
        const batchId = item.batchId;
        const batch = batches.find(
          (b) =>
            b.batchId === batchId ||
            b.id === batchId ||
            b._id === batchId ||
            b.batchNumber === item.batchNumber
        );
        const unitPrice = Number(item.unitPrice ?? batch?.sellingPrice ?? med?.sellingPrice ?? 0);
        const qty = Number(item.quantity || 1);
        const discPercent = Number(item.discountPercentage || 0);
        const discAmount = Number(item.discountAmount || 0);
        const amount = Number(item.finalTotal ?? (qty * unitPrice - discAmount));

        return {
          rowId: String(item.cartItemId || `cart_${Date.now()}_${idx}`),
          selectedMedicineId: medId || med?.medicineId || med?._id || '',
          selectedBatchId: batchId || batch?.batchId || batch?._id || '',
          productQuery: item.medicineName || med?.name || '',
          isSearchOpen: false,
          pack: med?.type || 'Tablet',
          pcs: '1',
          qty,
          stock: item.availableStock ?? batch?.quantity ?? med?.availableStock ?? 0,
          price: unitPrice,
          purchasePrice: Number(item.purchasePrice ?? batch?.purchasePrice ?? med?.purchasePrice ?? 0),
          discPercent,
          discAmount,
          amount,
          medicine: med || null,
          batch: batch || (item.batchNumber ? { batchId, batchNumber: item.batchNumber, quantity: item.availableStock } : null),
        };
      });

      if (isDefaultEmpty) {
        return convertedRows;
      }

      // If rows already exist, enrich missing objects if available, and append any new cart items
      let hasChanges = false;
      const updated = prev.map((r) => {
        if (!r.medicine && r.selectedMedicineId) {
          const foundMed = medicines.find(
            (m) => m.medicineId === r.selectedMedicineId || m.id === r.selectedMedicineId || m._id === r.selectedMedicineId
          );
          if (foundMed) {
            hasChanges = true;
            return { ...r, medicine: foundMed, pack: r.pack || foundMed.type || 'Tablet' };
          }
        }
        if (!r.batch && r.selectedBatchId) {
          const foundBatch = batches.find(
            (b) => b.batchId === r.selectedBatchId || b.id === r.selectedBatchId || b._id === r.selectedBatchId
          );
          if (foundBatch) {
            hasChanges = true;
            return { ...r, batch: foundBatch };
          }
        }
        return r;
      });

      const existingKeys = new Set(
        updated
          .filter((r) => r.selectedMedicineId)
          .map((r) => `${r.selectedMedicineId}_${r.selectedBatchId}`)
      );

      const newItems = convertedRows.filter(
        (cr) => !existingKeys.has(`${cr.selectedMedicineId}_${cr.selectedBatchId}`)
      );

      if (newItems.length > 0) {
        return [...updated.filter((r) => r.selectedMedicineId || r.productQuery.trim()), ...newItems];
      }

      return hasChanges ? updated : prev;
    });
  }, [cart, medicines, batches]);

  // Note / Directions state
  const [note, setNote] = useState('');

  // Overall Payment state
  const [orderDiscType, setOrderDiscType] = useState('percent'); // 'percent' | 'amount'
  const [orderDiscValue, setOrderDiscValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Card'
  const [cashReceived, setCashReceived] = useState('');

  // Processing & Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  // Sync default store name & current staff
  useEffect(() => {
    if (settings?.storeName) {
      setCompanyName(settings.storeName);
    }
  }, [settings?.storeName]);

  useEffect(() => {
    if (currentUser?.name && !orderTakenBy) {
      setOrderTakenBy(currentUser.name);
    }
  }, [currentUser?.name, orderTakenBy]);

  // Autofocus the first product row on POS mount so staff can type immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      focusPosCell(0, 0);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Dynamic Pack types extracted from database medicines + standard medical formats
  const dynamicPackOptions = useMemo(() => {
    const fromDb = medicines
      .map((m) => (m.type || '').trim())
      .filter(Boolean);
    const defaults = [
      'Tablet',
      'Strip',
      'Box',
      'Bottle',
      'Syrup',
      'Suspension',
      'Capsule',
      'Injection',
      'Cream',
      'Ointment',
      'Gel',
      'Drops',
      'Sachet',
      'Unit',
    ];
    return Array.from(new Set([...fromDb, ...defaults]));
  }, [medicines]);

  // Available Sellable Batches mapped to medicines
  const sellableBatchesMap = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      const medId = typeof b.medicineId === 'object' && b.medicineId !== null
        ? b.medicineId._id || b.medicineId.id || b.medicineId.medicineId
        : b.medicineId;
      if (!medId) return;
      if (!map[medId]) map[medId] = [];
      if (b.canSell && b.quantity > 0) {
        map[medId].push(b);
      }
    });
    return map;
  }, [batches]);

  // Focus target cell in products table
  const focusPosCell = (rIdx, cIdx) => {
    const el = document.querySelector(`[data-pos-row="${rIdx}"][data-pos-col="${cIdx}"]`);
    if (el) {
      el.focus();
      if (el.tagName === 'INPUT' && typeof el.select === 'function') {
        el.select();
      }
      return true;
    }
    return false;
  };

  // Add new medicine row and immediately focus its product search field
  const handleAddNewMedicineRow = (fromRowIndex = null) => {
    setRows((prev) => {
      const lastRow = prev[prev.length - 1];
      if (lastRow && !lastRow.selectedMedicineId && !lastRow.productQuery.trim()) {
        setTimeout(() => {
          focusPosCell(prev.length - 1, 0);
        }, 50);
        return prev;
      }

      const newRow = createEmptyRow(Date.now() + Math.random());
      const nextRows = [...prev, newRow];
      setTimeout(() => {
        focusPosCell(nextRows.length - 1, 0);
      }, 50);
      return nextRows;
    });
  };

  // Handle row product selection (supports auto-adding new row on Enter)
  const handleSelectProduct = (rowId, med, specificBatch = null, autoAddNew = false) => {
    const medId = med.medicineId || med.id || med._id;
    const medBatches = sellableBatchesMap[medId] || [];

    // Select specific batch or fallback to earliest expiring batch
    const activeBatch = specificBatch || medBatches[0] || null;
    const availableStock = activeBatch ? activeBatch.quantity : med.availableStock || 0;
    const unitPrice = activeBatch ? Number(activeBatch.sellingPrice || 0) : Number(med.sellingPrice || 0);
    const purchaseCost = activeBatch ? Number(activeBatch.purchasePrice || 0) : Number(med.purchasePrice || 0);

    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.rowId === rowId) {
          const pcsVal = Math.max(1, parseFloat(r.pcs) || 1);
          const qty = 1;
          const amount = Number((pcsVal * qty * unitPrice).toFixed(2));

          return {
            ...r,
            selectedMedicineId: medId,
            selectedBatchId: activeBatch ? activeBatch.batchId || activeBatch.id || activeBatch._id : '',
            productQuery: med.name,
            isSearchOpen: false,
            pack: med.type || 'Tablet',
            pcs: r.pcs || '1',
            qty,
            stock: availableStock,
            price: unitPrice,
            purchasePrice: purchaseCost,
            discPercent: 0,
            discAmount: 0,
            amount,
            medicine: med,
            batch: activeBatch,
          };
        }
        return r;
      });

      if (autoAddNew) {
        const lastRow = updated[updated.length - 1];
        if (lastRow && !lastRow.selectedMedicineId && !lastRow.productQuery.trim()) {
          setTimeout(() => {
            focusPosCell(updated.length - 1, 0);
          }, 50);
          return updated;
        }

        const newRow = createEmptyRow(Date.now() + Math.random());
        const nextRows = [...updated, newRow];
        setTimeout(() => {
          focusPosCell(nextRows.length - 1, 0);
        }, 50);
        return nextRows;
      }

      return updated;
    });
  };

  // Seamless Arrow Key & Enter Navigation throughout table
  const handleGridNavigation = (rIdx, cIdx, direction) => {
    if (direction === 'up') {
      if (rIdx > 0) {
        focusPosCell(rIdx - 1, cIdx);
      }
    } else if (direction === 'down') {
      if (rIdx < rows.length - 1) {
        focusPosCell(rIdx + 1, cIdx);
      } else if (rows[rIdx]?.selectedMedicineId) {
        handleAddNewMedicineRow(rIdx);
      }
    } else if (direction === 'left') {
      if (cIdx > 0) {
        focusPosCell(rIdx, cIdx - 1);
      } else if (rIdx > 0) {
        focusPosCell(rIdx - 1, 4);
      }
    } else if (direction === 'right') {
      if (cIdx < 4) {
        focusPosCell(rIdx, cIdx + 1);
      } else if (rIdx < rows.length - 1) {
        focusPosCell(rIdx + 1, 0);
      }
    }
  };

  const handleCellKeyDown = (e, rIdx, cIdx) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleGridNavigation(rIdx, cIdx, 'up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleGridNavigation(rIdx, cIdx, 'down');
    } else if (e.key === 'ArrowLeft') {
      const isInput = e.target.tagName === 'INPUT';
      const selStart = isInput ? e.target.selectionStart : 0;
      const isAllSelected = isInput && selStart === 0 && e.target.selectionEnd === (e.target.value || '').length;
      if (!isInput || selStart === 0 || isAllSelected) {
        e.preventDefault();
        handleGridNavigation(rIdx, cIdx, 'left');
      }
    } else if (e.key === 'ArrowRight') {
      const isInput = e.target.tagName === 'INPUT';
      const selEnd = isInput ? e.target.selectionEnd : 0;
      const valLen = isInput ? (e.target.value || '').length : 0;
      const isAllSelected = isInput && e.target.selectionStart === 0 && selEnd === valLen;
      if (!isInput || selEnd === valLen || isAllSelected) {
        e.preventDefault();
        handleGridNavigation(rIdx, cIdx, 'right');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // On Enter key in table cells: enter new medicine row or move to next line
      if (rIdx < rows.length - 1) {
        focusPosCell(rIdx + 1, 0);
      } else {
        handleAddNewMedicineRow(rIdx);
      }
    } else if (cIdx === 3 && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      updateRowField(rows[rIdx].rowId, 'qty', Math.min(rows[rIdx].stock || 99999, (Number(rows[rIdx].qty) || 1) + 1));
    } else if (cIdx === 3 && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      updateRowField(rows[rIdx].rowId, 'qty', Math.max(1, (Number(rows[rIdx].qty) || 1) - 1));
    }
  };

  // Row update helpers
  const updateRowField = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;

        const updated = { ...r, [field]: value };

        if (field === 'pcs' || field === 'qty' || field === 'price') {
          const rawPcs = field === 'pcs' ? value : r.pcs;
          const pcsVal = rawPcs === '' ? 1 : Math.max(1, parseFloat(rawPcs) || 1);
          const qVal = Math.max(1, parseInt(field === 'qty' ? value : r.qty, 10) || 1);
          const pVal = Math.max(0, parseFloat(field === 'price' ? value : r.price) || 0);

          updated.pcs = rawPcs;
          updated.qty = field === 'qty' ? qVal : r.qty;
          updated.price = field === 'price' ? pVal : r.price;
          updated.amount = Number((pcsVal * qVal * pVal).toFixed(2));
        }

        return updated;
      })
    );
  };

  const handleAddRow = () => {
    handleAddNewMedicineRow();
  };

  const handleRemoveRow = (rowId) => {
    removeFromCart(rowId);
    setRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow()];
      }
      return prev.filter((r) => r.rowId !== rowId);
    });
  };

  // Calculation totals
  const productsTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.selectedMedicineId ? Number(r.amount || 0) : 0), 0);
  }, [rows]);

  const orderDiscountAmount = useMemo(() => {
    const val = Number(orderDiscValue) || 0;
    if (orderDiscType === 'percent') {
      return Number(((productsTotal * Math.min(100, Math.max(0, val))) / 100).toFixed(2));
    }
    return Math.min(productsTotal, Math.max(0, val));
  }, [productsTotal, orderDiscType, orderDiscValue]);

  const billTotal = useMemo(() => {
    return Math.max(0, productsTotal - orderDiscountAmount);
  }, [productsTotal, orderDiscountAmount]);

  const totalReceived = useMemo(() => {
    if (cashReceived === '') return billTotal;
    return Math.max(0, parseFloat(cashReceived) || 0);
  }, [cashReceived, billTotal]);

  const balanceDue = useMemo(() => {
    if (totalReceived >= billTotal) {
      return 0; // Fully paid or change given
    }
    return Number((billTotal - totalReceived).toFixed(2));
  }, [billTotal, totalReceived]);

  const changeReturned = useMemo(() => {
    if (totalReceived > billTotal) {
      return Number((totalReceived - billTotal).toFixed(2));
    }
    return 0;
  }, [billTotal, totalReceived]);

  const qtyTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      if (!r.selectedMedicineId) return sum;
      const totalUnits = (parseFloat(r.pcs) || 1) * (parseInt(r.qty, 10) || 1);
      return sum + totalUnits;
    }, 0);
  }, [rows]);

  const purchasePriceTotal = useMemo(() => {
    return rows.reduce((sum, r) => {
      if (!r.selectedMedicineId) return sum;
      const totalUnits = (parseFloat(r.pcs) || 1) * (parseInt(r.qty, 10) || 1);
      return sum + totalUnits * Number(r.purchasePrice || 0);
    }, 0);
  }, [rows]);

  const profitTotal = useMemo(() => {
    if (billTotal <= 0) return 0;
    return Math.max(0, billTotal - purchasePriceTotal);
  }, [billTotal, purchasePriceTotal]);

  // Handle Sale Submission
  const handleSaveSale = async (shouldPrint = false) => {
    if (!canAddSale) {
      toast.showError('Access Denied: You do not have permission to execute sales.');
      return;
    }

    const validItems = rows.filter((r) => r.selectedMedicineId && r.selectedBatchId && r.qty > 0);
    if (validItems.length === 0) {
      toast.showError('Please add at least one valid product line before completing the sale.');
      return;
    }

    // Verify stock constraints against total units (pcs * qty)
    for (const item of validItems) {
      const totalUnits = (parseFloat(item.pcs) || 1) * (parseInt(item.qty, 10) || 1);
      if (totalUnits > item.stock) {
        toast.showError(
          `Insufficient stock for "${item.productQuery}". Available: ${item.stock}, requested: ${totalUnits}.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const salePayload = {
        patientName: buyerName.trim() || 'Walk-in Customer',
        customerName: buyerName.trim() || 'Walk-in Customer',
        doctorName: 'Self / Counter',
        prescription: note.trim() || 'Counter dispensing',
        prescriptionDescription: note.trim() || 'Counter dispensing',
        prescriptionRef: 'N/A',
        paymentMethod,
        amountReceived: totalReceived,
        orderDiscount: orderDiscountAmount,
        items: validItems.map((r) => {
          const totalUnits = (parseFloat(r.pcs) || 1) * (parseInt(r.qty, 10) || 1);
          return {
            batchId: r.selectedBatchId,
            medicineId: r.selectedMedicineId,
            medicineName: r.medicine?.name || r.productQuery,
            genericName: r.medicine?.genericName || '',
            formula: r.medicine?.formula || r.medicine?.genericName || '',
            strength: r.medicine?.strength || 'N/A',
            batchNumber: r.batch?.batchNumber || r.batch?.batchNo || 'N/A',
            pack: r.pack || 'Tablet',
            pcs: parseFloat(r.pcs) || 1,
            quantity: totalUnits,
            unitPrice: r.price,
            purchasePrice: r.purchasePrice,
            discountPercentage: r.discPercent,
            discountAmount: r.discAmount,
            subtotal: Number(r.amount || (totalUnits * r.price)),
            finalTotal: r.amount,
            total: r.amount,
          };
        }),
      };

      const res = await salesService.createSale(salePayload);
      const completedSale = res?.data?.sale || res?.data || res;

      // Instantly record the sale into SalesContext state and refresh sales history
      if (recordCompletedSale && completedSale) {
        recordCompletedSale(completedSale);
      } else if (refreshSales) {
        refreshSales();
      }

      // Update inventory & stock history
      await refreshInventory();
      clearCart();
      toast.showSuccess(`Sale completed & Invoice #${completedSale?.invoiceNumber || ''} generated!`);

      // Set invoice for modal
      setLastInvoice(completedSale);

      if (shouldPrint) {
        setTimeout(() => window.print(), 350);
      }

      playPosBeep(880, 0.08);
      setTimeout(() => playPosBeep(1174, 0.12), 90);

      // Reset form
      setRows([createEmptyRow()]);
      setNote('');
      setCashReceived('');
      setOrderDiscValue(0);
    } catch (err) {
      console.error('[POS] Sale error:', err);
      toast.showError(err.message || 'Failed to complete sale transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick POS Reset / Clear Sale
  const handleResetSale = () => {
    clearCart();
    setRows([createEmptyRow()]);
    setNote('');
    setCashReceived('');
    setOrderDiscValue(0);
    playPosBeep(600, 0.08);
    toast.showInfo('POS cart cleared. Ready for new sale.');
  };

  // Global Keyboard Shortcuts (F2: Save, F9: Print, F4: Add Row, F8: New Bill)
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // Don't intercept when modal is open
      if (isAddBuyerOpen || Boolean(lastInvoice)) return;

      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleSaveSale(false);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSaveSale(true);
      } else if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        handleAddRow();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleResetSale();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isAddBuyerOpen, lastInvoice, rows, totalReceived, billTotal]);

  // Add Buyer Quick Modal Handler
  const handleAddNewBuyer = () => {
    const trimmed = newBuyerInput.trim();
    if (!trimmed) return;
    if (!customBuyers.includes(trimmed) && !STANDARD_BUYER_PRESETS.includes(trimmed)) {
      setCustomBuyers((prev) => [...prev, trimmed]);
    }
    setBuyerName(trimmed);
    setNewBuyerInput('');
    setIsAddBuyerOpen(false);
  };

  const buyerDropdownOptions = useMemo(() => {
    const opts = [
      { isHeader: true, label: 'Standard Customer Types' },
      ...STANDARD_BUYER_PRESETS.map((p) => ({ value: p, label: p })),
    ];

    if (customBuyers.length > 0) {
      opts.push({ isHeader: true, label: 'Custom Added Buyers' });
      customBuyers.forEach((b) => {
        opts.push({ value: b, label: b });
      });
    }

    if (dbCustomers.length > 0) {
      const uniqueDb = dbCustomers.filter((c) => !STANDARD_BUYER_PRESETS.includes(c) && !customBuyers.includes(c));
      if (uniqueDb.length > 0) {
        opts.push({ isHeader: true, label: 'Recent Patients / Buyers (From DB)' });
        uniqueDb.forEach((c) => {
          opts.push({ value: c, label: c });
        });
      }
    }

    opts.push({
      value: '__ADD_NEW__',
      label: '+ Add Custom Buyer...',
      isAction: true,
    });

    return opts;
  }, [customBuyers, dbCustomers]);

  return (
    <div className="space-y-4">
      {/* =========================================================================
          TOP UNIFIED INVOICE CANVAS (Matching Image 1 Design)
          ========================================================================= */}
      <div className="w-full bg-white rounded-xl border border-slate-300 shadow-xs p-4 sm:p-5 space-y-5">
        {/* ROW 1: Company, Buyer (+ Add buyer), Order taken by, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Company */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-black flex items-center gap-1">
              <span>Company</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company Name"
                className="w-full h-9 px-3 text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-black focus:outline-none focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58] transition-colors"
              />
            </div>
          </div>

          {/* 2. Buyer */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-black flex items-center gap-1">
                <span>Buyer</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddBuyerOpen(true)}
                className="text-[11px] font-bold text-[#1C9A58] hover:text-[#158046] hover:underline cursor-pointer transition-colors"
              >
                + Add buyer
              </button>
            </div>
            <FilterDropdown
              value={buyerName}
              onChange={(val) => {
                if (val === '__ADD_NEW__') {
                  setIsAddBuyerOpen(true);
                } else {
                  setBuyerName(val);
                }
              }}
              options={buyerDropdownOptions}
              placeholder="Select Buyer"
              buttonClassName="h-9 px-3 text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border-slate-300 rounded-lg text-black"
              className="w-full"
            />
          </div>

          {/* 3. Order taken by (Current logged in user only) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-black flex items-center gap-1">
              <span>Order taken by</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              readOnly
              value={
                currentUser?.name
                  ? `${currentUser.name}${currentUser.role ? ` (${currentUser.role})` : ''}`
                  : 'Admin'
              }
              className="w-full h-9 px-3 text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-default select-none focus:outline-none focus:ring-0"
            />
          </div>

          {/* 4. Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-black flex items-center gap-1">
              <span>Date</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <ResponsiveDatePicker
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                align="right"
                quickPresets={false}
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: PRODUCTS TABLE (Interactive Billing Grid)
            ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black">
              Products
            </h3>
          </div>

          <div className="w-full overflow-x-auto overscroll-x-contain touch-pan-x border border-slate-300 rounded-lg">
            <table className="w-full min-w-[700px] lg:min-w-full text-left border-collapse table-auto text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
                  <th className="py-2 px-2.5 min-w-[170px]">Product</th>
                  <th className="py-2 px-2 w-28">Pack</th>
                  <th className="py-2 px-1 text-center w-14">Pcs</th>
                  <th className="py-2 px-1 text-center w-24">Qty</th>
                  <th className="py-2 px-1 text-center w-14">Stock</th>
                  <th className="py-2 px-2 text-right w-24">Price</th>
                  <th className="py-2 px-2 text-right w-24">Amount</th>
                  <th className="py-2 px-1.5 text-center w-10"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row, rowIndex) => (
                  <tr key={row.rowId} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. PRODUCT (Searchable dropdown outside of table via Portal) */}
                    <ProductSearchCell
                      row={row}
                      rowIndex={rowIndex}
                      rowsCount={rows.length}
                      medicines={medicines}
                      sellableBatchesMap={sellableBatchesMap}
                      updateRowField={updateRowField}
                      handleSelectProduct={handleSelectProduct}
                      onNavigateGrid={handleGridNavigation}
                      onEnterNewRow={handleAddNewMedicineRow}
                    />

                    {/* 2. PACK */}
                      <td className="py-2 px-2 w-28">
                        <select
                          data-pos-row={rowIndex}
                          data-pos-col={1}
                          value={row.pack}
                          onChange={(e) => updateRowField(row.rowId, 'pack', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)}
                          className="w-full h-8 px-2 text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-md text-black focus:outline-none focus:border-[#1C9A58] cursor-pointer transition-colors"
                        >
                          {dynamicPackOptions.map((p, idx) => (
                            <option key={idx} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. PCS */}
                      <td className="py-2 px-1 text-center w-14">
                        <input
                          data-pos-row={rowIndex}
                          data-pos-col={2}
                          type="number"
                          min="1"
                          value={row.pcs}
                          onChange={(e) => updateRowField(row.rowId, 'pcs', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)}
                          className="w-full h-8 text-center text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-md text-black focus:outline-none focus:border-[#1C9A58]"
                        />
                      </td>

                      {/* 4. QTY with Stepper */}
                      <td className="py-2 px-1 text-center w-24">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => updateRowField(row.rowId, 'qty', Math.max(1, (Number(row.qty) || 1) - 1))}
                            className="w-5 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-l border-y border-l border-slate-300 transition-colors cursor-pointer select-none"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            data-pos-row={rowIndex}
                            data-pos-col={3}
                            type="number"
                            min="1"
                            max={row.stock || 99999}
                            value={row.qty}
                            onChange={(e) => updateRowField(row.rowId, 'qty', e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)}
                            className="w-9 h-8 text-center text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border-y border-slate-300 text-black focus:outline-none focus:border-[#1C9A58]"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => updateRowField(row.rowId, 'qty', Math.min(row.stock || 99999, (Number(row.qty) || 1) + 1))}
                            className="w-5 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-r border-y border-r border-slate-300 transition-colors cursor-pointer select-none"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* 5. STOCK */}
                      <td className="py-2 px-1 text-center font-mono font-bold text-xs text-black w-14">
                        {row.stock}
                      </td>

                      {/* 6. PRICE (Compact input) */}
                      <td className="py-2 px-2 text-right w-24">
                        <div className="flex justify-end">
                          <input
                            data-pos-row={rowIndex}
                            data-pos-col={4}
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => updateRowField(row.rowId, 'price', e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                            className="w-20 h-8 text-right font-mono text-xs font-bold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-md text-black focus:outline-none focus:border-[#1C9A58]"
                          />
                        </div>
                      </td>

                      {/* 7. AMOUNT */}
                      <td className="py-2 px-2 text-right font-mono font-black text-xs text-black tabular-nums w-24">
                        {Number(row.amount || 0).toFixed(2)}
                      </td>

                      {/* 8. Delete Action */}
                      <td className="py-2 px-1.5 text-center w-10">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.rowId)}
                          className="w-7 h-7 flex items-center justify-center text-rose-500 hover:text-white hover:bg-rose-500 rounded-md border border-rose-200 transition-colors cursor-pointer"
                          title="Remove product line"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>

          {/* Row Actions: Add Product & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playPosBeep(900, 0.05);
                handleAddRow();
              }}
              className="text-xs font-bold text-[#1C9A58] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs flex-1 sm:flex-none"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add product <span className="hidden sm:inline">(Enter / F4)</span></span>
            </button>

            <button
              type="button"
              onClick={handleResetSale}
              className="text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs flex-1 sm:flex-none"
              title="Reset current cart / New Bill (F8)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Bill <span className="hidden sm:inline">(F8)</span></span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            ROW 3: BOTTOM SPLIT (Left Note & Action Buttons, Right Payment & Metrics)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-200 items-start">
          {/* LEFT COLUMN: Note + Action Buttons (7 Cols on desktop, order-2 on mobile so Save buttons are at the end) */}
          <div className="lg:col-span-7 space-y-4 order-2 lg:order-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-black block">Note</label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional prescription directions, doctor note, or comments..."
                className="w-full p-2.5 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50 hover:bg-white focus:bg-white text-black focus:outline-none focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58] transition-colors resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Action Buttons Row: Save sale, Save & Print, Save & PDF */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => handleSaveSale(false)}
                disabled={isSubmitting}
                className="px-4 sm:px-5 py-2 text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#158046] active:scale-98 rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : <>Save sale <span className="hidden sm:inline">(F2)</span></>}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveSale(true)}
                disabled={isSubmitting}
                className="px-4 sm:px-5 py-2 text-xs font-bold text-[#1C9A58] bg-white hover:bg-emerald-50 active:scale-98 border border-[#1C9A58] rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save & Print <span className="hidden sm:inline">(F9)</span></span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveSale(true)}
                disabled={isSubmitting}
                className="px-4 sm:px-5 py-2 text-xs font-bold text-black bg-white hover:bg-slate-100 active:scale-98 border border-slate-300 hover:border-black rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Save & PDF</span>
              </button>
            </div>

            {/* Quick POS Keyboard Shortcuts Bar - hidden on mobile / short screens */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-bold flex items-center gap-1 text-slate-600">
                <Keyboard className="w-3.5 h-3.5 text-[#1C9A58]" />
                <span>Shortcuts:</span>
              </span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">F2 Save</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">F9 Print</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">F4 Add Item</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">F8 New Bill</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">↑↓ Navigate</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Enter Select</span>
            </div>
          </div>

          {/* RIGHT COLUMN: PAYMENT Card & Metrics Footer (5 Cols on desktop, order-1 on mobile) */}
          <div className="lg:col-span-5 space-y-3 order-1 lg:order-2">
            {/* PAYMENT Card */}
            <div className="bg-slate-50/70 border border-slate-300 rounded-xl p-3.5 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black pb-1 border-b border-slate-200">
                Payment
              </h4>

              {/* 1. Products total */}
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="font-semibold text-black">Products total</span>
                <span className="font-mono font-bold text-black text-xs">
                  {productsTotal.toFixed(2)}
                </span>
              </div>

              {/* 2. Order Discount */}
              <div className="flex items-center justify-between text-xs py-0.5 gap-2">
                <span className="font-semibold text-black">Discount</span>
                <div className="flex items-center gap-1">
                  <div className="relative w-16">
                    <input
                      type="number"
                      min="0"
                      value={orderDiscValue || ''}
                      onChange={(e) => setOrderDiscValue(e.target.value)}
                      placeholder={orderDiscType === 'percent' ? '%' : 'Amt'}
                      className="w-full h-7 px-2 text-right font-mono text-xs font-bold border border-slate-300 rounded-md bg-white text-black focus:outline-none focus:border-[#1C9A58]"
                    />
                  </div>
                  <div className="flex items-center bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setOrderDiscType('percent')}
                      className={`px-1.5 py-0.5 rounded ${
                        orderDiscType === 'percent' ? 'bg-white text-black shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDiscType('amount')}
                      className={`px-1.5 py-0.5 rounded ${
                        orderDiscType === 'amount' ? 'bg-white text-black shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Amount
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Bill total */}
              <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200">
                <span className="font-bold text-black">Bill total</span>
                <span className="font-mono font-black text-sm text-[#1C9A58]">
                  {billTotal.toFixed(2)}
                </span>
              </div>

              {/* 4. Cash received & Payment method */}
              <div className="space-y-1.5 py-0.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-black">Cash received</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={billTotal.toFixed(2)}
                      className="w-24 h-7 px-2 text-right font-mono text-xs font-bold border border-slate-300 rounded-md bg-white text-black focus:outline-none focus:border-[#1C9A58]"
                    />
                    <button
                      type="button"
                      onClick={() => setPaymentMethod((prev) => (prev === 'Cash' ? 'Card' : 'Cash'))}
                      className={`h-7 px-2 text-[10px] font-bold rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                        paymentMethod === 'Cash'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          : 'bg-blue-100 text-blue-950 border-blue-300'
                      }`}
                    >
                      {paymentMethod === 'Cash' ? (
                        <Banknote className="w-3 h-3 text-emerald-800" />
                      ) : (
                        <CreditCard className="w-3 h-3 text-blue-800" />
                      )}
                      <span>{paymentMethod}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Tender Denomination Chips */}
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      playPosBeep(900, 0.05);
                      setCashReceived(billTotal.toFixed(2));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300 transition-colors cursor-pointer"
                  >
                    Exact
                  </button>
                  {[50, 100, 500, 1000, 5000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => {
                        playPosBeep(900, 0.05);
                        setCashReceived(String(denom));
                      }}
                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer font-mono"
                    >
                      {denom}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Total received */}
              <div className="flex items-center justify-between text-xs py-0.5">
                <span className="font-semibold text-black">Total received</span>
                <span className="font-mono font-bold text-black text-xs">
                  {totalReceived.toFixed(2)}
                </span>
              </div>

              {/* 6. Balance due / Change */}
              <div className="flex items-center justify-between text-xs py-0.5 border-t border-slate-200">
                <span className="font-semibold text-black">
                  {changeReturned > 0 ? 'Change return' : 'Balance due'}
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    changeReturned > 0 ? 'text-emerald-700' : balanceDue > 0 ? 'text-rose-600' : 'text-black'
                  }`}
                >
                  {changeReturned > 0 ? changeReturned.toFixed(2) : balanceDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Metrics 3-Col Box (QTY TOTAL, PURCHASE PRICE, PROFIT) */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Qty Total
                </span>
                <span className="font-mono font-black text-sm text-black block mt-0.5">
                  {qtyTotal > 0 ? qtyTotal : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Purchase Price
                </span>
                <span className="font-mono font-black text-sm text-black block mt-0.5">
                  {purchasePriceTotal.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Profit
                </span>
                <span className="font-mono font-black text-sm text-[#1C9A58] block mt-0.5">
                  {profitTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          QUICK ADD BUYER MODAL
          ========================================================================= */}
      {isAddBuyerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="bg-white rounded-xl border border-slate-300 shadow-xl w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-sm font-bold text-black">Add New Buyer / Customer</h4>
              <button
                type="button"
                onClick={() => setIsAddBuyerOpen(false)}
                className="text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-black">Buyer Name</label>
              <input
                type="text"
                autoFocus
                value={newBuyerInput}
                onChange={(e) => setNewBuyerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewBuyer()}
                placeholder="e.g. Usman Medical / John Doe"
                className="w-full h-9 px-3 text-xs font-bold border border-slate-300 rounded-lg text-black focus:outline-none focus:border-[#1C9A58] focus:ring-1 focus:ring-[#1C9A58]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddBuyerOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-black hover:bg-slate-100 rounded-lg border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewBuyer}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#158046] rounded-lg"
              >
                Add Buyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE INVOICE MODAL
          ========================================================================= */}
      <InvoiceModal
        isOpen={Boolean(lastInvoice)}
        onClose={() => setLastInvoice(null)}
        invoice={lastInvoice}
        onNewSale={() => setLastInvoice(null)}
      />
    </div>
  );
};

export default POS;
