import { useState } from 'react';
import { Button } from '../common/Button';
import { CheckCircle2, ShieldCheck, Tag, Check, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const OrderSummary = ({
  orderSummary,
  onCheckout,
  disabled = false,
  cashierName = 'Staff Pharmacist',
  onApplyCartDiscount,
}) => {
  const [showBillDiscount, setShowBillDiscount] = useState(false);
  const [billDiscountVal, setBillDiscountVal] = useState('');

  const handleApplyBillDiscount = (pct) => {
    if (onApplyCartDiscount) {
      onApplyCartDiscount(pct);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200">
      <div className="space-y-1.5 text-xs text-black">
        <div className="flex justify-between font-bold">
          <span>Subtotal ({orderSummary.totalItems} items):</span>
          <span className="font-mono text-black">
            {formatCurrency(orderSummary.subtotal)}
          </span>
        </div>

        {orderSummary.discountAmount > 0 && (
          <div className="flex justify-between text-emerald-800 font-bold">
            <span>Total Discount Savings:</span>
            <span className="font-mono">-{formatCurrency(orderSummary.discountAmount)}</span>
          </div>
        )}

        {/* Bill-wide Discount Option */}
        {onApplyCartDiscount && orderSummary.totalItems > 0 && (
          <div className="pt-1">
            {!showBillDiscount ? (
              <button
                type="button"
                onClick={() => setShowBillDiscount(true)}
                className="text-[11px] font-bold text-[#1C9A58] hover:text-[#0F3A2C] flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Tag className="w-3 h-3" />
                <span>Apply discount to all cart items</span>
              </button>
            ) : (
              <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Apply to all items:</span>
                  <button
                    type="button"
                    onClick={() => setShowBillDiscount(false)}
                    className="text-slate-400 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyBillDiscount(pct)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-emerald-100 text-black border border-slate-200 cursor-pointer shadow-2xs"
                    >
                      {pct === 0 ? 'Clear Disc' : `${pct}%`}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="Custom %"
                      value={billDiscountVal}
                      onChange={(e) => setBillDiscountVal(e.target.value)}
                      className="w-16 h-6 px-1.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1C9A58]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const num = parseFloat(billDiscountVal);
                        if (!isNaN(num) && num >= 0) {
                          handleApplyBillDiscount(Math.min(100, num));
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#1C9A58] hover:bg-[#158046] rounded cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-bold text-black pt-2 border-t border-slate-200">
          <span>Final Amount:</span>
          <span className="text-xl font-bold font-mono text-[#0F3A2C]">
            {formatCurrency(orderSummary.grandTotal)}
          </span>
        </div>
      </div>

      <div className="pt-1">
        <button
          type="button"
          disabled={disabled || orderSummary.totalItems === 0}
          onClick={onCheckout}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-[#1C9A58] hover:bg-[#0F3A2C] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-white" />
          Complete Sale & Print Receipt
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-black">
        <ShieldCheck className="w-3.5 h-3.5 text-[#1C9A58]" />
        <span>Verified by {cashierName} &bull; Stock deducted upon checkout</span>
      </div>
    </div>
  );
};

export default OrderSummary;
