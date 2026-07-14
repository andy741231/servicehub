import { Redo2, Undo2 } from 'lucide-react';

export default function BuilderHistoryControls({ onUndo, onRedo, canUndo, canRedo, size = 'default' }) {
  const iconClassName = size === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const buttonClassName = size === 'compact'
    ? 'flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-30'
    : 'flex h-10 w-10 items-center justify-center rounded-base border border-border text-muted transition-colors hover:bg-surface-raised hover:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="flex items-center gap-1" aria-label="Edit history">
      <button type="button" onClick={onUndo} disabled={!canUndo} className={buttonClassName} title="Undo (Ctrl+Z)" aria-label="Undo">
        <Undo2 className={iconClassName} />
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} className={buttonClassName} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
        <Redo2 className={iconClassName} />
      </button>
    </div>
  );
}
