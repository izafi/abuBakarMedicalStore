import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export const TrendChart = ({
  data = [],
  dataKey = 'value',
  labelKey = 'label',
  color = '#1C9A58',
  secondaryColor = '#0F3A2C',
  isCurrency = true,
  height = 180,
  emptyMessage = 'No transaction data available for this period',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200"
      >
        {emptyMessage}
      </div>
    );
  }

  const values = data.map((d) => Number(d[dataKey]) || 0);
  const maxValue = Math.max(...values, 10);
  const chartHeight = height - 40; // reserve space for x labels and tooltip

  return (
    <div className="w-full font-sans select-none">
      {/* Active Value Display / Hover Tooltip Header */}
      <div className="h-6 flex items-center justify-between text-xs mb-1 px-1">
        {hoveredIndex !== null ? (
          <>
            <span className="font-semibold text-gray-700">
              {data[hoveredIndex][labelKey]}
            </span>
            <span className="font-black text-[#0F3A2C]">
              {isCurrency
                ? formatCurrency(data[hoveredIndex][dataKey])
                : `${data[hoveredIndex][dataKey]} units`}
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-gray-400">Past 14 Days Activity</span>
            <span className="text-[11px] font-semibold text-gray-500">
              Peak: {isCurrency ? formatCurrency(maxValue) : `${maxValue} units`}
            </span>
          </>
        )}
      </div>

      {/* SVG Chart Area */}
      <div className="relative" style={{ height: chartHeight }}>
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-gray-400 w-full" />
          <div className="border-b border-gray-300 w-full" />
          <div className="border-b border-gray-300 w-full" />
          <div className="border-b border-gray-400 w-full" />
        </div>

        {/* Bar & Area Columns */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 pt-4">
          {data.map((item, idx) => {
            const val = Number(item[dataKey]) || 0;
            const barHeightPct = Math.max(4, Math.round((val / maxValue) * 100));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Visual Bar with Gradient */}
                <div
                  style={{
                    height: `${barHeightPct}%`,
                    backgroundColor: isHovered ? secondaryColor : color,
                  }}
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-200 shadow-2xs ${
                    isHovered ? 'opacity-100 scale-x-105' : 'opacity-85 hover:opacity-100'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis Date Labels (Every alternate day to prevent crowding) */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 px-1">
        <span>{data[0]?.[labelKey]}</span>
        <span>{data[Math.floor(data.length / 2)]?.[labelKey]}</span>
        <span>{data[data.length - 1]?.[labelKey]}</span>
      </div>
    </div>
  );
};

export default TrendChart;
