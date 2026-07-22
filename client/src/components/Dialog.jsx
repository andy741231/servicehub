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
 *
 *   // 3. Prompt dialog (replaces window.prompt)
 *   const { promptDialog, PromptDialogMount } = usePrompt();
 *   const name = await promptDialog({
 *     title: 'Folder name:',
 *     defaultValue: 'New Folder',
 *     confirmLabel: 'Create',
 *   });
 *   if (!name) return;
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Info, MessageSquare } from 'lucide-react';

// ─── Focus trap hook ────────────────────────────────────────────────────────

function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    // Handle Tab key to trap focus
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Cleanup: restore focus when modal closes
    return () => {
      container.removeEventListener('keydown', handleTab);
      previousActiveElementRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

// ─── Base modal shell ────────────────────────────────────────────────────────

function ModalShell({ onClose, children }) {
  const containerRef = useFocusTrap(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="bg-surface rounded-2xl shadow-modal w-full max-w-md mx-4 overflow-hidden animate-[fadeInScale_0.15s_ease-out]"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * AccessibleModal — a flexible modal shell with focus trap, Escape handling,
 * focus restoration, and scroll locking. Supports custom sizes and labels.
 *
 * Props:
 * - onClose: required, called on Escape / backdrop click
 * - labelledById: id of the title element for aria-labelledby
 * - label: accessible name for aria-label (if no title element)
 * - maxWidth: max-width class (e.g. 'max-w-2xl', 'max-w-5xl'); default 'max-w-md'
 * - className: additional classes for the dialog panel
 * - children: dialog content
 */
export function AccessibleModal({ onClose, labelledById, label, maxWidth = 'max-w-md', className = '', children }) {
  const containerRef = useFocusTrap(true);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Scroll lock on the body while the modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className={`bg-surface rounded-2xl shadow-modal w-full ${maxWidth} mx-4 overflow-hidden animate-[fadeInScale_0.15s_ease-out] ${className}`}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Variant config ──────────────────────────────────────────────────────────

const VARIANTS = {
  danger: {
    iconBg:   'bg-danger-light',
    iconColor: 'text-danger',
    Icon:      Trash2,
    confirmCls: 'bg-danger hover:bg-danger/90 focus:ring-danger text-primary-foreground',
  },
  warning: {
    iconBg:   'bg-warning-light',
    iconColor: 'text-warning',
    Icon:      AlertTriangle,
    confirmCls: 'bg-warning hover:bg-warning/90 focus:ring-warning text-primary-foreground',
  },
  default: {
    iconBg:   'bg-primary-light',
    iconColor: 'text-primary',
    Icon:      Info,
    confirmCls: 'bg-primary hover:bg-primary-hover focus:ring-primary text-primary-foreground',
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
            <h3 className="text-base font-semibold text-text-base">{title}</h3>
            {message && <p className="mt-1 text-sm text-muted leading-relaxed">{message}</p>}
          </div>
          <button onClick={onCancel} className="flex-shrink-0 p-3 min-w-[44px] min-h-[44px] text-subtle hover:text-text-base rounded-lg hover:bg-surface-raised" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 bg-surface-raised border-t border-border-soft">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text-base bg-surface border border-border rounded-lg hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
            <h3 className="text-base font-semibold text-text-base">{title}</h3>
            {message && <p className="mt-1 text-sm text-muted leading-relaxed">{message}</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end px-6 py-4 bg-surface-raised border-t border-border-soft">
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

// ─── PromptDialog ────────────────────────────────────────────────────────────

function PromptDialog({ title, message, defaultValue = '', placeholder = '', confirmLabel = 'OK', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(inputRef.current?.value || '');
  };

  return (
    <ModalShell onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${v.iconBg}`}>
              <MessageSquare className={`w-5 h-5 ${v.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-text-base">{title}</h3>
              {message && <p className="mt-1 text-sm text-muted leading-relaxed">{message}</p>}
              <input
                ref={inputRef}
                type="text"
                defaultValue={defaultValue}
                placeholder={placeholder}
                className="mt-3 w-full px-3 py-2 text-sm border border-border-strong rounded-lg bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button type="button" onClick={onCancel} className="flex-shrink-0 p-3 min-w-[44px] min-h-[44px] text-subtle hover:text-text-base rounded-lg hover:bg-surface-raised" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-surface-raised border-t border-border-soft">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-base bg-surface border border-border rounded-lg hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${v.confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
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

/**
 * usePrompt()
 * Returns { promptDialog, PromptDialogMount }
 * - promptDialog(options) → Promise<string|null>  (null if cancelled)
 * - PromptDialogMount: mount this once anywhere in the component's JSX
 */
export function usePrompt() {
  const [state, setState] = useState(null);

  const promptDialog = useCallback((options) =>
    new Promise((resolve) => {
      setState({ ...options, resolve });
    }), []);

  const handleConfirm = (value) => { state?.resolve(value); setState(null); };
  const handleCancel  = () => { state?.resolve(null);  setState(null); };

  const PromptDialogMount = state ? (
    <PromptDialog
      title={state.title}
      message={state.message}
      defaultValue={state.defaultValue}
      placeholder={state.placeholder}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { promptDialog, PromptDialogMount };
}
