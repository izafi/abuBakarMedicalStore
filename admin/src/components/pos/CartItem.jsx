import { useState } from 'react';
import { Trash2, Clock, Layers, Percent, Check } from 'lucide-react';
import { QuantityControl } from './QuantityControl';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PRESET_DISCOUNTS = [0, 5, 10, 15];

export const CartItem = ({
  item,
  availableBatches = [],
  onQuantityChange,
  onDiscountChange,
  onBatchChange,
  onRemove,
}) => {
  // If multiple valid batches exist for this medicine, allow quick switching
  const validBatches = availableBatches.filter(
    (b) => b.medicineId === item.medicineId && b.canSell && b.quantity > 0
  );

  const isPreset = PRESET_DISCOUNTS.includes(item.discountPercentage);
  const isCustomActive = !isPreset && item.discountPercentage > 0;

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customUnit, setCustomUnit] = useState('%'); // '%' | 'Rs'
  const [customValue, setCustomValue] = useState('');

  const handleCustomValueChange = (e) => {
    const valStr = e.target.value;
    setCustomValue(valStr);
    const num = parseFloat(valStr);
    if (valStr === '' || isNaN(num) || num < 0) {
      onDiscountChange(item.cartItemId, 0);
    } else if (customUnit === '%') {
      const safePct = Math.min(100, Math.max(0, num));
      onDiscountChange(item.cartItemId, safePct);
    } else {
      const safeAmt = Math.min(item.subtotal, Math.max(0, num));
      onDiscountChange(item.cartItemId, null, safeAmt);
    }
  };

  const handleUnitSwitch = (newUnit) => {
    setCustomUnit(newUnit);
    if (newUnit === '%') {
      const currentPct = item.discountPercentage || 0;
      setCustomValue(currentPct > 0 ? String(currentPct) : '');
      if (currentPct > 0) {
        onDiscountChange(item.cartItemId, currentPct);
      }
    } else {
      const currentAmt = item.discountAmount || 0;
      setCustomValue(currentAmt > 0 ? String(currentAmt) : '');
      if (currentAmt > 0) {
        onDiscountChange(item.cartItemId, null, currentAmt);
      }
    }
  };

  return (
    <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2.5 hover:border-[#1C9A58]/50 transition-all">
      {/* 1. Header: Medicine Name, Strength, Line Total & Remove Action */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-black leading-snug">
              {item.medicineName}
            </h4>
            <span className="text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              {item.strength}
            </span>
            {item.isNearExpiry && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-amber-700" />
                Near Expiry
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
            {item.genericName}
          </p>
        </div>

        {/* Line Total & Remove button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-sm sm:text-base font-bold font-mono text-[#0F3A2C]">
              {formatCurrency(item.finalTotal)}
            </div>
            {item.discountAmount > 0 && (
              <div className="text-[11px] font-mono text-emerald-700 font-bold line-through">
                {formatCurrency(item.subtotal)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.cartItemId)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Metadata Bar: Batch, Expiry, and Unit Rate */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-black font-mono font-bold">
            <Layers className="w-3.5 h-3.5 text-[#1C9A58]" />
            {validBatches.length > 1 ? (
              <select
                value={item.batchId}
                onChange={(e) => onBatchChange(item.cartItemId, e.target.value)}
                className="bg-transparent font-mono font-bold text-xs text-black focus:outline-none cursor-pointer border-b border-dashed border-slate-400"
                title="Switch batch"
              >
                {validBatches.map((b) => (
                  <option key={b.batchId || b.id} value={b.batchId || b.id}>
                    {b.batchNumber || b.batchNo} ({b.quantity} left)
                  </option>
                ))}
              </select>
            ) : (
              <span>{item.batchNumber}</span>
            )}
          </div>
          <span className="text-slate-500 font-medium text-xs">
            &bull; Exp: {formatDate(item.expiryDate)}
          </span>
        </div>

        <div className="text-xs font-bold text-black">
          <span className="text-slate-500 font-medium">Rate: </span>
          <span className="font-mono text-black">{formatCurrency(item.unitPrice)}</span>
        </div>
      </div>

      {/* 3. Operational Controls: Quantity Stepper & Responsive Discount Pills */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1 border-t border-slate-100">
        {/* Quantity Stepper */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            Qty:
          </span>
          <QuantityControl
            quantity={item.quantity}
            maxStock={item.availableStock}
            onQuantityChange={(q) => onQuantityChange(item.cartItemId, q)}
          />
          <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">
            / {item.availableStock} max
          </span>
        </div>

        {/* Responsive Discount Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-black mr-0.5">
            Disc:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {PRESET_DISCOUNTS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  setIsCustomOpen(false);
                  setCustomValue('');
                  onDiscountChange(item.cartItemId, pct);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isPreset && item.discountPercentage === pct
                    ? pct === 0
                      ? 'bg-slate-300 text-black font-extrabold shadow-xs'
                      : 'bg-[#1C9A58] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {pct === 0 ? 'None' : `${pct}%`}
              </button>
            ))}

            {/* Custom Discount Button */}
            <button
              type="button"
              onClick={() => {
                const nextState = !isCustomOpen;
                setIsCustomOpen(nextState);
                if (nextState) {
                  if (customUnit === 'Rs') {
                    setCustomValue(item.discountAmount > 0 ? String(item.discountAmount) : '');
                  } else {
                    setCustomValue(
                      item.discountPercentage > 0 && !isPreset
                        ? String(item.discountPercentage)
                        : ''
                    );
                  }
                }
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                isCustomActive
                  ? 'bg-[#1C9A58] text-white shadow-xs'
                  : isCustomOpen
                  ? 'bg-emerald-100 text-[#1C9A58] border border-[#1C9A58] font-extrabold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title="Add custom discount (% or Rs)"
            >
              <span>
                {isCustomActive
                  ? customUnit === 'Rs'
                    ? `Rs. ${item.discountAmount}`
                    : `${item.discountPercentage}%`
                  : 'Custom'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Collapsible Custom Discount Drawer */}
      {isCustomOpen && (
        <div className="w-full pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/90">
          <div className="flex items-center gap-2 flex-wrap min-w-[200px]">
            <span className="text-xs font-bold text-black">
              Custom Discount:
            </span>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                max={customUnit === '%' ? 100 : item.subtotal}
                step="any"
                value={customValue}
                onChange={handleCustomValueChange}
                placeholder={customUnit === '%' ? 'e.g. 12' : `e.g. 25 (max ${item.subtotal})`}
                autoFocus
                className="w-24 h-7 px-2 text-xs font-bold font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1C9A58]/30 focus:border-[#1C9A58] text-black shadow-2xs"
              />
            </div>

            {/* % vs Rs Toggle */}
            <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleUnitSwitch('%')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  customUnit === '%'
                    ? 'bg-[#1C9A58] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="Discount as Percentage"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleUnitSwitch('Rs')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                  customUnit === 'Rs'
                    ? 'bg-[#1C9A58] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="Discount as Flat Rupees"
              >
                Rs.
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {item.discountAmount > 0 && (
              <span className="text-xs font-bold font-mono text-emerald-800 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                Discount: -{formatCurrency(item.discountAmount)} ({item.discountPercentage}%)
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="px-2.5 py-1 text-xs font-bold text-white bg-[#1C9A58] hover:bg-[#158046] rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              title="Apply & Close"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartItem;
