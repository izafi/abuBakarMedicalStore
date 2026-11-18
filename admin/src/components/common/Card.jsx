/**
 * Reusable Card container for SaaS layouts
 */
export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  padding = true,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-100 shadow-xs
        ${hoverEffect ? 'hover:shadow-md hover:border-gray-200 transition-all duration-200' : ''}
        ${padding ? 'p-5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex items-start justify-between pb-4 border-b border-gray-100 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
};

export default Card;
