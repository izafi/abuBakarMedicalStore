import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component with multiple variants, loading states, and icon support
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft: IconLeft = null,
  iconRight: IconRight = null,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-lg';

  const variants = {
    primary:
      'bg-[#1C9A58] hover:bg-[#158046] active:bg-[#0E6033] text-white shadow-sm focus:ring-[#1C9A58]/50',
    secondary:
      'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 focus:ring-gray-300',
    outline:
      'border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 shadow-xs focus:ring-[#1C9A58]/30',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm focus:ring-rose-500/50',
    ghost:
      'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:ring-gray-200',
    dark:
      'bg-[#0F3A2C] hover:bg-[#164E3C] text-white shadow-sm focus:ring-[#0F3A2C]/50',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {IconLeft && <IconLeft className="w-4 h-4 shrink-0" />}
          {children}
          {IconRight && <IconRight className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};

export default Button;
