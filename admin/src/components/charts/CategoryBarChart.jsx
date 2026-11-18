export const CategoryBarChart = ({
  data = [],
  nameKey = 'category',
  valueKey = 'count',
  unit = 'units',
  maxItems = 7,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        No category stock distribution recorded.
      </div>
    );
  }

  const sorted = [...data]
    .sort((a, b) => (Number(b[valueKey]) || 0) - (Number(a[valueKey]) || 0))
    .slice(0, maxItems);

  const totalValue = sorted.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0) || 1;
  const maxValue = Math.max(...sorted.map((item) => Number(item[valueKey]) || 0), 1);

  // Modern professional pharmacy palette
  const colors = [
    '#1C9A58',
    '#0F3A2C',
    '#2563EB',
    '#0D9488',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
  ];

  return (
    <div className="space-y-3 font-sans">
      {sorted.map((item, index) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / totalValue) * 100);
        const barWidthPct = Math.max(3, Math.round((val / maxValue) * 100));
        const color = colors[index % colors.length];

        return (
          <div key={item[nameKey] || index} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700 truncate max-w-[160px]">
                {item[nameKey]}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gray-900">
                  {val.toLocaleString()} {unit}
                </span>
                <span className="text-[10px] text-gray-400 w-8 text-right font-medium">
                  {pct}%
                </span>
              </div>
            </div>

            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${barWidthPct}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryBarChart;
