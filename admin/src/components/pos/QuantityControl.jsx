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
    <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg p-0.5 shadow-xs">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={handleDecrement}
        className="w-6 h-6 rounded flex items-center justify-center text-black hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Decrease quantity"
      >
        <Minus className="w-3 h-3 stroke-[2.5]" />
      </button>

      <input
        type="number"
        min="1"
        max={maxStock}
        disabled={disabled}
        value={quantity}
        onChange={handleManualChange}
        className="w-9 text-center text-xs font-bold font-mono bg-transparent text-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        type="button"
        disabled={disabled || quantity >= maxStock}
        onClick={handleIncrement}
        className="w-6 h-6 rounded flex items-center justify-center text-black hover:bg-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Increase quantity"
      >
        <Plus className="w-3 h-3 stroke-[2.5]" />
      </button>
    </div>
  );
};

export default QuantityControl;
