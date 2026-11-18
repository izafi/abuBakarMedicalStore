import { Button } from '../common/Button';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const OrderSummary = ({
  orderSummary,
  onCheckout,
  disabled = false,
  cashierName = 'Staff Pharmacist',
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-100">
      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal ({orderSummary.totalItems} items):</span>
          <span className="font-semibold text-gray-800">
            {formatCurrency(orderSummary.subtotal)}
          </span>
        </div>

        {orderSummary.discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Total Discount Savings:</span>
            <span>-{formatCurrency(orderSummary.discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-100">
          <span>Final Amount:</span>
          <span className="text-[#1C9A58]">
            {formatCurrency(orderSummary.grandTotal)}
          </span>
        </div>
      </div>

      <div className="pt-1">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={disabled || orderSummary.totalItems === 0}
          onClick={onCheckout}
          iconLeft={CheckCircle2}
        >
          Complete Sale & Print Receipt
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Verified by {cashierName} • Stock deducted upon checkout</span>
      </div>
    </div>
  );
};

export default OrderSummary;
