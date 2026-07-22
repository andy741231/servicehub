/**
 * Toast.jsx — Lightweight toast notification system
 *
 * Usage:
 *   const { toast, ToastMount } = useToast();
 *   // In JSX: <ToastMount />
 *   // In handlers:
 *   toast('Changes saved.');                          // default (success)
 *   toast('Something went wrong.', 'error');
 *   toast('Double-check your input.', 'warning');
 *   toast('Page created.', 'success');
 *   toast('FYI: draft saved.', 'info');
 *   // With action button (e.g. Undo):
 *   toast('Section deleted.', { type: 'info', action: { label: 'Undo', onClick: restoreSection } });
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const CONFIGS = {
  success: { Icon: Check,         bg: 'bg-text-base',  text: 'text-inverse',  iconBg: 'bg-success'  },
  error:   { Icon: AlertCircle,   bg: 'bg-text-base',  text: 'text-inverse',  iconBg: 'bg-danger'   },
  warning: { Icon: AlertTriangle, bg: 'bg-text-base',  text: 'text-inverse',  iconBg: 'bg-warning'  },
  info:    { Icon: Info,          bg: 'bg-text-base',  text: 'text-inverse',  iconBg: 'bg-info'     },
};

let _id = 0;

function ToastItem({ id, message, type = 'success', action, duration, onDismiss }) {
  const cfg = CONFIGS[type] || CONFIGS.success;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 300);
    }, duration || 3500);
    return () => clearTimeout(t);
  }, [id, duration, onDismiss]);

  const handleAction = () => {
    action?.onClick?.();
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm ${cfg.bg} ${cfg.text}
        transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      role="status"
      aria-live="polite"
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
        <cfg.Icon className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium">{message}</span>
      {action && (
        <button
          onClick={handleAction}
          className="flex-shrink-0 px-3 py-1.5 text-sm font-semibold rounded-md bg-white/15 hover:bg-white/25 transition-colors min-h-[36px]"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(id), 300); }}
        className="flex-shrink-0 p-3 min-w-[44px] min-h-[44px] opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * useToast()
 * Returns { toast, ToastMount }
 * - toast(message, typeOrOptions?) — shows a toast. Pass a string for type,
 *   or an object { type, action: { label, onClick }, duration } for advanced use.
 * - ToastMount — renders the toast stack; mount once in component JSX
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, typeOrOptions = 'success') => {
    const id = ++_id;
    const opts = typeof typeOrOptions === 'string'
      ? { type: typeOrOptions }
      : typeOrOptions;
    setToasts(prev => [...prev, { id, message, ...opts }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastMount = (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );

  return { toast, ToastMount };
}
