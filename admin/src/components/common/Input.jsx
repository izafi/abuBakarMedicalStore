import { forwardRef } from 'react';

/**
 * Reusable Form Input / Select / Textarea component with validation states
 */
export const Input = forwardRef(
  (
    {
      label,
      name,
      type = 'text',
      placeholder = '',
      value,
      onChange,
      error = null,
      helperText = null,
      required = false,
      disabled = false,
      iconLeft: IconLeft = null,
      iconRight: IconRight = null,
      className = '',
      inputClassName = '',
      options = [], // For select inputs
      rows = 3, // For textarea
      ...props
    },
    ref
  ) => {
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';

    const inputBaseStyles = `
      w-full rounded-lg border text-sm transition-colors duration-150
      focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${
        error
          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900 bg-rose-50/20'
          : 'border-gray-200 focus:border-[#1C9A58] focus:ring-[#1C9A58]/20 text-gray-800 bg-white'
      }
      ${IconLeft ? 'pl-9' : 'pl-3'}
      ${IconRight ? 'pr-9' : 'pr-3'}
      ${isTextarea ? 'py-2.5' : 'h-10 py-2'}
      ${inputClassName}
    `;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label
            htmlFor={name}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {IconLeft && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <IconLeft className="w-4 h-4" />
            </div>
          )}

          {isSelect ? (
            <select
              ref={ref}
              id={name}
              name={name}
              value={value}
              onChange={onChange}
              disabled={disabled}
              className={inputBaseStyles}
              {...props}
            >
              {options.map((opt, idx) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return (
                  <option key={idx} value={optValue}>
                    {optLabel}
                  </option>
                );
              })}
            </select>
          ) : isTextarea ? (
            <textarea
              ref={ref}
              id={name}
              name={name}
              rows={rows}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={inputBaseStyles}
              {...props}
            />
          ) : (
            <input
              ref={ref}
              type={type}
              id={name}
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
              className={inputBaseStyles}
              {...props}
            />
          )}

          {IconRight && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <IconRight className="w-4 h-4" />
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
