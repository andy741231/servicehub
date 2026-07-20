import { BLOCK_TYPES } from './editorUtils';

export default function BlockPalette({ onAddBlock, onClose }) {
  return (
    <div className="w-64 bg-surface border-r border-border h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-base">Add Block</h3>
        {onClose && (
          <button type="button" onClick={onClose} className="text-muted hover:text-text-base text-sm">
            Close
          </button>
        )}
      </div>
      <div className="space-y-2">
        {BLOCK_TYPES.map((block) => {
          const Icon = block.Icon;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onAddBlock(block.id)}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary-light/30 transition-colors flex gap-3 items-start"
            >
              {Icon && <Icon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />}
              <div>
                <div className="font-medium text-text-base text-sm">{block.name}</div>
                <div className="text-xs text-muted mt-0.5">{block.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
