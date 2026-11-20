import { Banknote, CreditCard } from 'lucide-react';
import { PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';

export const PaymentSelector = ({
  paymentMethod,
  onMethodChange,
  amountReceived,
  onAmountReceivedChange,
  grandTotal,
}) => {
  const changeReturned = Math.max(0, (Number(amountReceived) || grandTotal) - grandTotal);
  const presetDenominations = [500, 1000, 5000].filter((val) => val >= grandTotal);

  return (
    <div className="space-y-2.5 pt-3 border-t border-slate-200">
      <div>
        <label className="block text-[11px] font-bold text-black uppercase tracking-wider mb-1.5">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMethodChange(PAYMENT_METHODS.CASH)}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              paymentMethod === PAYMENT_METHODS.CASH
                ? 'border-[#1C9A58] bg-emerald-50 text-emerald-950 ring-2 ring-[#1C9A58]/20 shadow-xs'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-black'
            }`}
          >
            <Banknote className="w-4 h-4 text-[#1C9A58]" />
            <span>Cash</span>
          </button>

          <button
            type="button"
            onClick={() => onMethodChange(PAYMENT_METHODS.CARD)}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
              paymentMethod === PAYMENT_METHODS.CARD
                ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-black'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Debit / Card</span>
          </button>
        </div>
      </div>

      {paymentMethod === PAYMENT_METHODS.CASH && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-black font-bold">Cash Received:</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amountReceived === 0 ? '' : amountReceived}
              onChange={(e) => onAmountReceivedChange(parseFloat(e.target.value) || 0)}
              placeholder={String(Math.ceil(grandTotal))}
              className="w-24 h-8 px-2 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58]/20 focus:border-[#1C9A58] text-black shadow-xs"
            />
          </div>

          {presetDenominations.length > 0 && (
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              <span className="text-[10px] text-black font-bold uppercase tracking-wider">
                Quick:
              </span>
              {presetDenominations.slice(0, 3).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onAmountReceivedChange(amt)}
                  className="px-2 py-0.5 text-[10px] font-bold font-mono bg-white border border-slate-300 rounded-md hover:bg-slate-100 text-black transition-colors cursor-pointer shadow-xs"
                >
                  Rs. {amt}
                </button>
              ))}
            </div>
          )}

          {Number(amountReceived) > grandTotal && (
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs font-bold">
              <span className="text-emerald-900">Change Returned:</span>
              <span className="font-mono text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                {formatCurrency(changeReturned)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentSelector;
