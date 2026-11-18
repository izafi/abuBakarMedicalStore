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
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMethodChange(PAYMENT_METHODS.CASH)}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              paymentMethod === PAYMENT_METHODS.CASH
                ? 'border-[#1C9A58] bg-emerald-50 text-[#0F3A2C]'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <Banknote className="w-4 h-4 text-[#1C9A58]" />
            <span>Cash</span>
          </button>

          <button
            type="button"
            onClick={() => onMethodChange(PAYMENT_METHODS.CARD)}
            className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              paymentMethod === PAYMENT_METHODS.CARD
                ? 'border-[#1C9A58] bg-emerald-50 text-[#0F3A2C]'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Debit / Card</span>
          </button>
        </div>
      </div>

      {paymentMethod === PAYMENT_METHODS.CASH && (
        <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-600 font-medium">Cash Received:</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amountReceived === 0 ? '' : amountReceived}
              onChange={(e) => onAmountReceivedChange(parseFloat(e.target.value) || 0)}
              placeholder={String(Math.ceil(grandTotal))}
              className="w-24 h-8 px-2 text-xs font-bold text-right bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1C9A58] text-gray-900"
            />
          </div>

          {presetDenominations.length > 0 && (
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[10px] text-gray-400">Quick:</span>
              {presetDenominations.slice(0, 3).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onAmountReceivedChange(amt)}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-700"
                >
                  Rs. {amt}
                </button>
              ))}
            </div>
          )}

          {Number(amountReceived) > grandTotal && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs font-bold">
              <span className="text-emerald-700">Change Returned:</span>
              <span className="text-emerald-700">{formatCurrency(changeReturned)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentSelector;
