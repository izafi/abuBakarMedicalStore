import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Accessible Modal Dialog Component
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:py-6 sm:px-4 overflow-y-auto select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          relative w-full ${sizeClasses[size] || sizeClasses.md}
          bg-white rounded-2xl shadow-2xl border border-slate-200/90
          z-10 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] overflow-hidden
          ${className}
        `}
      >
        {/* Header (Pinned) */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200/80 shrink-0 bg-white">
          <div className="flex-1 pr-3">
            <h2 id="modal-title" className="text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Body (Scrollable with min-h-0) */}
        <div id="modal-scroll-body" className="p-3.5 sm:p-4 overflow-y-auto min-h-0 space-y-3">
          {children}
        </div>

        {/* Footer (Pinned to very bottom) */}
        {footer && (
          <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50 border-t border-slate-200/80 rounded-b-2xl flex items-center justify-end gap-3 mt-auto shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
