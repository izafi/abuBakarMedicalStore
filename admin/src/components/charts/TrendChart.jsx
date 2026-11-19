import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export const TrendChart = ({
  data = [],
  dataKey = 'value',
  labelKey = 'label',
  color = '#2563EB',
  secondaryColor = '#1D4ED8',
  isCurrency = false,
  height = 180,
  emptyMessage = 'No data recorded for this period',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center text-xs text-neutral-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200"
      >
        {emptyMessage}
      </div>
    );
  }

  const values = data.map((d) => Number(d[dataKey]) || 0);
  const maxValue = Math.max(...values, 10);
  const chartHeight = height - 42;

  return (
    <div className="w-full font-sans select-none">
      {/* Active Value Display / Hover Tooltip Header */}
      <div className="h-6 flex items-center justify-between text-xs mb-1 px-0.5">
        {hoveredIndex !== null ? (
          <>
            <span className="font-bold text-neutral-800">
              {data[hoveredIndex][labelKey]}
            </span>
            <span className="font-extrabold text-blue-700 tabular-nums text-sm">
              {isCurrency
                ? formatCurrency(data[hoveredIndex][dataKey])
                : `${data[hoveredIndex][dataKey]} units`}
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-neutral-600 font-medium">Daily Stock Purchases</span>
            <span className="text-[11px] font-bold text-neutral-800">
              Peak: {isCurrency ? formatCurrency(maxValue) : `${maxValue} units`}
            </span>
          </>
        )}
      </div>

      {/* SVG & Bar Chart Area */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
        </div>

        {/* Bar Columns */}
        <div className="absolute inset-0 flex items-end justify-between gap-1.5 pt-3">
          {data.map((item, idx) => {
            const val = Number(item[dataKey]) || 0;
            const barHeightPct = Math.max(5, Math.round((val / maxValue) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Visual Bar with Modern Rounded Shape */}
                <div
                  style={{
                    height: `${barHeightPct}%`,
                    backgroundColor: isHovered ? secondaryColor : color,
                  }}
                  className={`w-full max-w-[20px] rounded-t-lg transition-all duration-200 ${
                    isHovered
                      ? 'shadow-md shadow-blue-500/30 scale-y-105'
                      : val > 0
                      ? 'opacity-90 hover:opacity-100 shadow-2xs'
                      : 'opacity-30 bg-slate-200'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis Date Labels */}
      <div className="flex justify-between items-center text-[10px] text-neutral-600 font-medium mt-2 px-1">
        <span>{data[0]?.[labelKey]}</span>
        <span>{data[Math.floor(data.length / 2)]?.[labelKey]}</span>
        <span>{data[data.length - 1]?.[labelKey]}</span>
      </div>
    </div>
  );
};

export default TrendChart;
