import { Percent } from 'lucide-react';

export const DiscountInput = ({
  discountPercentage = 0,
  onDiscountChange,
  disabled = false,
}) => {
  const handleChange = (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) {
      onDiscountChange(0);
    } else if (val > 100) {
      onDiscountChange(100);
    } else {
      onDiscountChange(val);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex items-center">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          disabled={disabled}
          value={discountPercentage === 0 ? '' : discountPercentage}
          onChange={handleChange}
          placeholder="0"
          className="w-12 h-7 px-1.5 pr-4 text-xs font-semibold text-right bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1C9A58] text-gray-900"
        />
        <Percent className="w-2.5 h-2.5 text-gray-400 absolute right-1 pointer-events-none" />
      </div>

      {/* Quick discount chips */}
      <div className="flex items-center gap-0.5">
        {[5, 10].map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={disabled}
            onClick={() => onDiscountChange(pct)}
            className={`px-1 py-0.5 text-[9px] font-bold rounded transition-colors ${
              discountPercentage === pct
                ? 'bg-[#1C9A58] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>
    </div>
  );
};

export default DiscountInput;
