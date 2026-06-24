# Modal System Specification

## Overview
This document defines the consistent modal system for the application, based on the existing `Dialog.jsx` component and best practices identified across the codebase.

## Core Principles

### 1. Use Shared Components
- **Primary**: `Dialog.jsx` for all confirmation and alert dialogs
- **Secondary**: Custom inline modals only when complex content is needed
- **Toast**: `Toast.jsx` for non-blocking notifications

### 2. Accessibility Standards
- All modals must have `role="dialog"` and `aria-modal="true"`
- All modals must implement focus trap using `useFocusTrap` hook
- All modals must support keyboard navigation (Escape to close, Tab to navigate)
- All modals must have proper ARIA labels (`aria-labelledby` for titles)

### 3. Visual Consistency
- **Z-Index**: `z-[9999]` for all modal overlays (highest priority)
- **Backdrop**: `bg-black/40 backdrop-blur-[2px]` for all modals
- **Container**: `bg-white rounded-2xl shadow-2xl` for standard modals
- **Animation**: `animate-[fadeInScale_0.15s_ease-out]` for consistent enter animation

## Component API

### useConfirm() Hook
Replaces `window.confirm()` for confirmation dialogs.

```javascript
const { confirmDialog, ConfirmDialogMount } = useConfirm();

// In JSX (mount once):
<ConfirmDialogMount />

// In handler:
const ok = await confirmDialog({
  title: 'Delete this item?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',  // optional, default 'Confirm'
  cancelLabel: 'Cancel',   // optional, default 'Cancel'
  variant: 'danger',       // 'danger' | 'warning' | 'default'
});
if (!ok) return;
```

### useAlert() Hook
Replaces `window.alert()` for alert dialogs.

```javascript
const { alertDialog, AlertDialogMount } = useAlert();

// In JSX (mount once):
<AlertDialogMount />

// In handler:
await alertDialog({
  title: 'Success!',
  message: 'Your changes have been saved.',
  okLabel: 'OK',           // optional, default 'OK'
  variant: 'default',      // 'danger' | 'warning' | 'default'
});
```

### useToast() Hook
For non-blocking notifications (replaces inline error alerts).

```javascript
const { toast, ToastMount } = useToast();

// In JSX (mount once):
<ToastMount />

// In handler:
toast('Changes saved.', 'success');      // success, error, warning, info
toast('Something went wrong.', 'error');
```

## Variant System

### Danger Variant
- **Use for**: Destructive actions (delete, remove, etc.)
- **Icon**: Trash2
- **Colors**: Red theme (`bg-red-100`, `text-red-600`, `bg-red-600`)
- **Example**: Delete confirmation dialogs

### Warning Variant
- **Use for**: Potentially problematic actions
- **Icon**: AlertTriangle
- **Colors**: Amber theme (`bg-amber-100`, `text-amber-600`, `bg-amber-500`)
- **Example**: Session expiration, important warnings

### Default Variant
- **Use for**: General information and success messages
- **Icon**: Info
- **Colors**: Blue theme (`bg-blue-100`, `text-blue-600`, `bg-blue-600`)
- **Example**: Success alerts, general confirmations

## Custom Modal Pattern

For complex modals that need custom content (forms, multi-step wizards, etc.):

```javascript
import { useFocusTrap } from '../components/Dialog';

function CustomModal({ isOpen, onClose, children }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-[fadeInScale_0.15s_ease-out]"
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {children}
      </div>
    </div>
  );
}
```

## Migration Guide

### From window.confirm()
```javascript
// OLD:
if (confirm('Are you sure you want to delete this item?')) {
  deleteItem();
}

// NEW:
const { confirmDialog, ConfirmDialogMount } = useConfirm();
// In JSX: <ConfirmDialogMount />
const ok = await confirmDialog({
  title: 'Delete this item?',
  message: 'This action cannot be undone.',
  variant: 'danger',
});
if (ok) {
  deleteItem();
}
```

### From window.alert()
```javascript
// OLD:
alert('Failed to save. Please try again.');

// NEW:
const { alertDialog, AlertDialogMount } = useAlert();
// In JSX: <AlertDialogMount />
await alertDialog({
  title: 'Error',
  message: 'Failed to save. Please try again.',
  variant: 'danger',
});

// OR use toast for non-blocking:
const { toast, ToastMount } = useToast();
// In JSX: <ToastMount />
toast('Failed to save. Please try again.', 'error');
```

## Design Tokens

The following design tokens from `index.css` should be used:

```css
/* Modal shadow */
--shadow-modal: 0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04);

/* Border radius */
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px; /* Use for modals */
```

## Implementation Checklist

When implementing or refactoring modals:

- [ ] Use `useConfirm()` for confirmation dialogs
- [ ] Use `useAlert()` for alert dialogs
- [ ] Use `useToast()` for non-blocking notifications
- [ ] Use `z-[9999]` for z-index
- [ ] Use `bg-black/40 backdrop-blur-[2px]` for backdrop
- [ ] Use `bg-white rounded-2xl shadow-2xl` for container
- [ ] Include `role="dialog"` and `aria-modal="true"`
- [ ] Implement focus trap with `useFocusTrap`
- [ ] Support Escape key to close
- [ ] Support click-outside-to-close
- [ ] Use appropriate variant (danger/warning/default)
- [ ] Mount dialog components once in JSX

## Current State

### Already Using Shared System
- ✅ Web/Pages.jsx - uses `useConfirm()` and `useToast()`
- ✅ Web/Assets.jsx - uses `useConfirm()` and `useToast()`
- ✅ Web/HeaderFooter.jsx - uses `useToast()`
- ✅ Web/OldWebBuilder.jsx - uses `useToast()`

### Needs Migration
- ❌ Email/CampaignComposer.jsx - 4 `alert()` calls
- ❌ Email/MailingLists.jsx - 1 `confirm()` call
- ❌ Email/EmailDashboard.jsx - 1 `confirm()` call
- ❌ Forms/FormsDashboard.jsx - 1 `window.confirm()` call
- ❌ Forms/Submissions.jsx - 1 `window.confirm()` call
- ❌ Public/FormView.jsx - 1 `alert()` call

### Custom Modals (Keep as-is if complex)
- Admin/Users.jsx - 2 custom modals (complex forms)
- Web/Pages.jsx - 1 custom modal (ItemModal with complex form)
- Web/InlineEditor.jsx - 6 custom modals (various complex UI)
- Email/MailingLists.jsx - 3 custom modals (forms)
- Forms/Submissions.jsx - 1 custom modal (detail view)

## Benefits

1. **Consistency**: All dialogs look and behave the same way
2. **Accessibility**: Proper ARIA support and keyboard navigation
3. **Maintainability**: Single source of truth for dialog behavior
4. **User Experience**: Non-blocking toasts for better UX
5. **Type Safety**: Consistent API across the application
