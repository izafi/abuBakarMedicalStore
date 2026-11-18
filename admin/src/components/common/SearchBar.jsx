import { useRef } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Reusable SearchBar component with quick clear and keyboard support
 */
export const SearchBar = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search medicines, formulas, batch numbers...',
  className = '',
  autoFocus = false,
  shortcutHint = null,
}) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
        <Search className="w-4 h-4 text-gray-400" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-10 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 transition-colors focus:outline-none focus:border-[#1C9A58] focus:ring-2 focus:ring-[#1C9A58]/20 shadow-2xs"
      />

      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      ) : shortcutHint ? (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded">
            {shortcutHint}
          </kbd>
        </div>
      ) : null}
    </div>
  );
};

export default SearchBar;
