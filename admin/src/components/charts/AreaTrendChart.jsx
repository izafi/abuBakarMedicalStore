import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

export const AreaTrendChart = ({
  data = [],
  dataKey = 'value',
  labelKey = 'label',
  color = '#1C9A58',
  gradientId = 'revenueTrendGrad',
  isCurrency = true,
  height = 180,
  emptyMessage = 'No revenue activity recorded',
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
  const chartWidth = 500; // SVG viewBox coordinate space

  // Generate smooth cubic bezier SVG path
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1 || 1)) * chartWidth;
    const val = Number(item[dataKey]) || 0;
    const y = chartHeight - (val / maxValue) * (chartHeight - 14) - 8;
    return { x, y, val, item };
  });

  // Build curved path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  // Closed area path for gradient
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="w-full font-sans select-none">
      {/* Active Value Header */}
      <div className="h-6 flex items-center justify-between text-xs mb-1 px-0.5">
        {hoveredIndex !== null ? (
          <>
            <span className="font-bold text-neutral-800">
              {data[hoveredIndex][labelKey]}
            </span>
            <span className="font-extrabold text-[#1C9A58] tabular-nums text-sm">
              {isCurrency
                ? formatCurrency(data[hoveredIndex][dataKey])
                : `${data[hoveredIndex][dataKey]} units`}
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] text-neutral-600 font-medium">14-Day Sales Curve</span>
            <span className="text-[11px] font-bold text-neutral-800">
              Peak: {isCurrency ? formatCurrency(maxValue) : `${maxValue} units`}
            </span>
          </>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="70%" stopColor={color} stopOpacity="0.08" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#E2E8F0" strokeDasharray="3 3" />
          <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#E2E8F0" strokeDasharray="3 3" />
          <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#E2E8F0" strokeDasharray="3 3" />

          {/* Gradient Filled Area */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Smooth Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair & Data Dots */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={idx}>
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={0}
                    x2={p.x}
                    y2={chartHeight}
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : p.val > 0 ? 3 : 1.5}
                  fill={isHovered ? '#FFFFFF' : p.val > 0 ? color : '#CBD5E1'}
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Transparent Interactive Hover Slices */}
        <div className="absolute inset-0 flex">
          {data.map((_, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex-1 h-full cursor-pointer"
            />
          ))}
        </div>
      </div>

      {/* X-Axis Dates */}
      <div className="flex justify-between items-center text-[10px] text-neutral-600 font-medium mt-2 px-1">
        <span>{data[0]?.[labelKey]}</span>
        <span>{data[Math.floor(data.length / 2)]?.[labelKey]}</span>
        <span>{data[data.length - 1]?.[labelKey]}</span>
      </div>
    </div>
  );
};

export default AreaTrendChart;
