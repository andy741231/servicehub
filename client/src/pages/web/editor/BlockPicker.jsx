/**
 * BlockPicker — docked "Add block" panel (left of the canvas).
 *
 * Click a block to add it to the bottom of the target section, or drag it
 * onto any section on the page to place it at that row. The panel is not a
 * modal, so the canvas stays usable as a drop target while it's open.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, GripVertical } from 'lucide-react';
import { BLOCK_TYPES, BLOCK_CATEGORIES } from './editorUtils';

export const BLOCK_DRAG_TYPE = 'application/x-site-block';

export default function BlockPicker({ targetSectionIndex, sectionCount, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCK_TYPES;
    return BLOCK_TYPES.filter((b) => `${b.name} ${b.description} ${b.keywords || ''}`.toLowerCase().includes(q));
  }, [query]);

  const target = targetSectionIndex ?? sectionCount - 1;

  return (
    <aside
      className="w-72 shrink-0 border-r border-border bg-surface sticky top-[52px] self-start h-[calc(100vh-52px)] overflow-y-auto"
      aria-label="Add block"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="sticky top-0 bg-surface z-10 border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <h2 className="text-sm font-semibold text-text-base">Add block</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised text-muted" aria-label="Close add block panel" title="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 pb-3">
          <label className="relative block">
            <span className="sr-only">Search blocks</span>
            <Search className="w-4 h-4 text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); onAdd(matches[0].id, target, null); } }}
              placeholder="Search blocks"
              className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-border rounded-md bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <p className="mt-2 text-xs text-subtle">
            Click to add to section {target + 1}, or drag onto the page.
          </p>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {matches.length === 0 && <p className="px-1 text-sm text-muted">No blocks match “{query}”.</p>}
        {BLOCK_CATEGORIES.map((cat) => {
          const items = matches.filter((b) => b.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} aria-label={cat}>
              <h3 className="px-1 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">{cat}</h3>
              <ul className="space-y-1">
                {items.map(({ id, name, description, Icon }) => (
                  <li key={id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(BLOCK_DRAG_TYPE, id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAdd(id, target, null)}
                      className="group w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing"
                      aria-label={`Add ${name} block`}
                    >
                      <span className="w-9 h-9 rounded-lg bg-surface-raised group-hover:bg-primary-light flex items-center justify-center shrink-0">
                        <Icon className="w-[18px] h-[18px] text-muted group-hover:text-primary" aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-text-base">{name}</span>
                        <span className="block text-xs text-muted truncate">{description}</span>
                      </span>
                      <GripVertical className="w-4 h-4 text-subtle opacity-0 group-hover:opacity-100" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
