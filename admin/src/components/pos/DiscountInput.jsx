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
          className="w-11 h-7 pl-1 pr-3.5 text-xs font-bold font-mono text-right bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1C9A58] text-black shadow-xs"
        />
        <Percent className="w-2.5 h-2.5 text-black absolute right-1 pointer-events-none" />
      </div>

      {/* Quick discount chips */}
      <div className="flex items-center gap-0.5">
        {[5, 10].map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={disabled}
            onClick={() => onDiscountChange(discountPercentage === pct ? 0 : pct)}
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors cursor-pointer disabled:cursor-not-allowed ${
              discountPercentage === pct
                ? 'bg-[#1C9A58] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-200'
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
