/**
 * Dialog.jsx — Shared modal dialog primitives
 *
 * Usage:
 *
 *   // 1. Confirm dialog (replaces window.confirm)
 *   const { confirmDialog, ConfirmDialogMount } = useConfirm();
 *   // In JSX: <ConfirmDialogMount />
 *   // In handler:
 *   const ok = await confirmDialog({
 *     title:   'Delete page?',
 *     message: 'Sub-menu items will also be removed.',
 *     confirmLabel: 'Delete',       // optional, default 'Confirm'
 *     variant: 'danger',            // 'danger' | 'warning' | 'default'
 *   });
 *   if (!ok) return;
 *
 *   // 2. Alert dialog (replaces window.alert)
 *   const { alertDialog, AlertDialogMount } = useAlert();
 *   await alertDialog({ title: 'Saved!', message: 'Your changes have been saved.' });
 */

import { useState, useCallback, useRef } from 'react';
import { X, Trash2, AlertTriangle, Info } from 'lucide-react';

// ─── Base modal shell ────────────────────────────────────────────────────────

function ModalShell({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeInScale_0.15s_ease-out]"
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Variant config ──────────────────────────────────────────────────────────

const VARIANTS = {
  danger: {
    iconBg:   'bg-red-100',
    iconColor: 'text-red-600',
    Icon:      Trash2,
    confirmCls: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  },
  warning: {
    iconBg:   'bg-amber-100',
    iconColor: 'text-amber-600',
    Icon:      AlertTriangle,
    confirmCls: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400 text-white',
  },
  default: {
    iconBg:   'bg-blue-100',
    iconColor: 'text-blue-600',
    Icon:      Info,
    confirmCls: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  },
};

// ─── ConfirmDialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <ModalShell onClose={onCancel}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.iconBg}`}>
            <v.Icon className={`w-5 h-5 ${v.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>}
          </div>
          <button onClick={onCancel} className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          autoFocus
          className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${v.confirmCls}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── AlertDialog ─────────────────────────────────────────────────────────────

function AlertDialog({ title, message, okLabel = 'OK', variant = 'default', onClose }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <ModalShell onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.iconBg}`}>
            <v.Icon className={`w-5 h-5 ${v.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onClose}
          autoFocus
          className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${v.confirmCls}`}
        >
          {okLabel}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * useConfirm()
 * Returns { confirmDialog, ConfirmDialogMount }
 * - confirmDialog(options) → Promise<boolean>
 * - ConfirmDialogMount: mount this once anywhere in the component's JSX
 */
export function useConfirm() {
  const [state, setState] = useState(null); // { ...options, resolve }

  const confirmDialog = useCallback((options) =>
    new Promise((resolve) => {
      setState({ ...options, resolve });
    }), []);

  const handleConfirm = () => { state?.resolve(true);  setState(null); };
  const handleCancel  = () => { state?.resolve(false); setState(null); };

  const ConfirmDialogMount = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirmDialog, ConfirmDialogMount };
}

/**
 * useAlert()
 * Returns { alertDialog, AlertDialogMount }
 * - alertDialog(options) → Promise<void>
 * - AlertDialogMount: mount this once anywhere in the component's JSX
 */
export function useAlert() {
  const [state, setState] = useState(null);

  const alertDialog = useCallback((options) =>
    new Promise((resolve) => {
      setState({ ...options, resolve });
    }), []);

  const handleClose = () => { state?.resolve(); setState(null); };

  const AlertDialogMount = state ? (
    <AlertDialog
      title={state.title}
      message={state.message}
      okLabel={state.okLabel}
      variant={state.variant}
      onClose={handleClose}
    />
  ) : null;

  return { alertDialog, AlertDialogMount };
}
