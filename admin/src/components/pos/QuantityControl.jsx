import { Plus, Minus } from 'lucide-react';

export const QuantityControl = ({
  quantity,
  maxStock,
  onQuantityChange,
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxStock) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleManualChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      onQuantityChange(1);
    } else if (val > maxStock) {
      onQuantityChange(maxStock);
    } else {
      onQuantityChange(val);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={handleDecrement}
        className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 disabled:opacity-40 transition-colors"
        title="Decrease quantity"
      >
        <Minus className="w-3 h-3" />
      </button>

      <input
        type="number"
        min="1"
        max={maxStock}
        disabled={disabled}
        value={quantity}
        onChange={handleManualChange}
        className="w-10 text-center text-xs font-bold bg-transparent text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        type="button"
        disabled={disabled || quantity >= maxStock}
        onClick={handleIncrement}
        className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 disabled:opacity-40 transition-colors"
        title="Increase quantity"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};

export default QuantityControl;
