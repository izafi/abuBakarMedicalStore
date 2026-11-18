import { Trash2, Clock, Layers } from 'lucide-react';
import { QuantityControl } from './QuantityControl';
import { DiscountInput } from './DiscountInput';
import { formatCurrency, formatDate } from '../../utils/formatters';

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
    (b) => (b.medicineId === item.medicineId) && b.canSell && b.quantity > 0
  );

  return (
    <div className="py-3 px-1 border-b border-gray-100 last:border-b-0 space-y-2">
      {/* Line Item Header: Name, Generic, Batch & Expiry */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-gray-900 truncate">
              {item.medicineName}
            </h4>
            <span className="text-[10px] text-gray-400 font-medium">
              ({item.strength})
            </span>
            {item.isNearExpiry && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                <Clock className="w-2.5 h-2.5" />
                Near Expiry
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 truncate">
            {item.genericName}
          </p>
        </div>

        {/* Delete Item Action */}
        <button
          type="button"
          onClick={() => onRemove(item.cartItemId)}
          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
          title="Remove from cart"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Batch Selector & Available Batch Stock Info */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50/80 px-2 py-1 rounded-md">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-gray-400" />
          {validBatches.length > 1 ? (
            <select
              value={item.batchId}
              onChange={(e) => onBatchChange(item.cartItemId, e.target.value)}
              className="bg-transparent font-mono font-bold text-[10px] text-gray-800 focus:outline-none cursor-pointer border-b border-dashed border-gray-400"
              title="Select different stock batch"
            >
              {validBatches.map((b) => (
                <option key={b.batchId || b.id} value={b.batchId || b.id}>
                  {b.batchNumber || b.batchNo} ({b.quantity} left)
                </option>
              ))}
            </select>
          ) : (
            <span className="font-mono font-bold text-[10px] text-gray-800">
              {item.batchNumber}
            </span>
          )}
          <span className="text-[10px] text-gray-400">
            • Exp: {formatDate(item.expiryDate)}
          </span>
        </div>

        <span className="text-[10px] font-semibold text-gray-600">
          Stock: {item.availableStock}
        </span>
      </div>

      {/* Pricing Controls: Qty, Discount, Unit Price, and Line Total */}
      <div className="grid grid-cols-12 gap-2 items-center text-xs">
        {/* Unit Price */}
        <div className="col-span-3">
          <span className="text-[10px] text-gray-400 block">Unit Price</span>
          <span className="font-semibold text-gray-800">
            {formatCurrency(item.unitPrice)}
          </span>
        </div>

        {/* Quantity Control */}
        <div className="col-span-4 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 block mb-0.5">Quantity</span>
          <QuantityControl
            quantity={item.quantity}
            maxStock={item.availableStock}
            onQuantityChange={(q) => onQuantityChange(item.cartItemId, q)}
          />
        </div>

        {/* Discount Input */}
        <div className="col-span-2 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 block mb-0.5">Disc %</span>
          <DiscountInput
            discountPercentage={item.discountPercentage}
            onDiscountChange={(d) => onDiscountChange(item.cartItemId, d)}
          />
        </div>

        {/* Line Final Total */}
        <div className="col-span-3 text-right">
          <span className="text-[10px] text-gray-400 block">Total</span>
          <span className="font-bold text-gray-900 text-xs">
            {formatCurrency(item.finalTotal)}
          </span>
          {item.discountAmount > 0 && (
            <span className="text-[9px] text-emerald-600 block line-through">
              {formatCurrency(item.subtotal)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItem;
