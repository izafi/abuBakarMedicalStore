import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

/**
 * Toast Container & Notification Item Components
 */
export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  const config = {
    success: {
      icon: CheckCircle2,
      container: 'bg-white border-emerald-500/30 text-gray-800 shadow-lg shadow-emerald-950/5',
      iconColor: 'text-[#1C9A58] bg-emerald-50',
      bar: 'bg-[#1C9A58]',
    },
    error: {
      icon: AlertOctagon,
      container: 'bg-white border-rose-500/30 text-gray-800 shadow-lg shadow-rose-950/5',
      iconColor: 'text-rose-600 bg-rose-50',
      bar: 'bg-rose-500',
    },
    warning: {
      icon: AlertTriangle,
      container: 'bg-white border-amber-500/30 text-gray-800 shadow-lg shadow-amber-950/5',
      iconColor: 'text-amber-600 bg-amber-50',
      bar: 'bg-amber-500',
    },
    info: {
      icon: Info,
      container: 'bg-white border-blue-500/30 text-gray-800 shadow-lg shadow-blue-950/5',
      iconColor: 'text-blue-600 bg-blue-50',
      bar: 'bg-blue-500',
    },
  };

  const style = config[toast.type] || config.info;
  const Icon = style.icon;

  return (
    <div
      role="status"
      className={`
        pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2
        ${style.container}
      `}
    >
      <div className={`w-1 absolute left-0 top-0 bottom-0 ${style.bar}`} />
      <div className={`p-1.5 rounded-lg shrink-0 ${style.iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 text-xs font-medium leading-relaxed pt-0.5">
        {toast.message}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ToastContainer;
