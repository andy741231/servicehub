/**
 * BlockPicker — docked "Add Block" panel (left of the canvas).
 *
 * Layout (reskin): a category rail on the left and the chosen category's
 * blocks as a grid of tiles; typing in search shows matches from every
 * category. Click a tile to add it to the target section, or drag it onto
 * any section on the page to place it at that row. Enter in search adds the
 * first match. The panel is not a modal and stays open after adding, so the
 * canvas stays usable as a drop target.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { BLOCK_TYPES, BLOCK_CATEGORIES, CATEGORY_ICONS } from './editorUtils';

export const BLOCK_DRAG_TYPE = 'application/x-site-block';

function Tile({ block, onAdd, target }) {
  const { id, name, description, Icon } = block;
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(BLOCK_DRAG_TYPE, id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onAdd(id, target, null)}
      className="group w-full flex flex-col items-center justify-start gap-1.5 rounded-[10px] border border-border bg-surface px-1 pt-3 pb-2 min-h-[84px] text-center hover:border-primary hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing transition-colors"
      aria-label={`Add ${name} block`}
      title={`${description} — click to add, or drag onto the page`}
    >
      <span className="w-10 h-10 rounded-[8px] bg-surface-raised group-hover:bg-surface flex items-center justify-center">
        <Icon className="w-5 h-5 text-text-base group-hover:text-primary" aria-hidden="true" />
      </span>
      <span className="text-[11px] leading-tight font-medium text-text-base">{name}</span>
    </button>
  );
}

export default function BlockPicker({ targetSectionIndex, sectionCount, lastAdded, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(BLOCK_CATEGORIES[0]);
  const searchRef = useRef(null);
  const railRef = useRef(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOCK_TYPES;
    return BLOCK_TYPES.filter((b) => `${b.name} ${b.description} ${b.keywords || ''}`.toLowerCase().includes(q));
  }, [query]);
  const searching = query.trim().length > 0;
  const shown = searching ? matches : BLOCK_TYPES.filter((b) => b.category === category);

  const target = targetSectionIndex ?? sectionCount - 1;

  // Vertical tab list: arrows move between categories.
  const railKeys = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = BLOCK_CATEGORIES.indexOf(category);
    const next = BLOCK_CATEGORIES[(i + (e.key === 'ArrowDown' ? 1 : -1) + BLOCK_CATEGORIES.length) % BLOCK_CATEGORIES.length];
    setCategory(next);
    railRef.current?.querySelector(`[data-cat="${CSS.escape(next)}"]`)?.focus();
  };

  return (
    <aside
      className="w-[380px] shrink-0 border-r border-border bg-surface sticky top-[52px] self-start h-[calc(100vh-52px)] flex flex-col"
      aria-label="Add block"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
    >
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <h2 className="text-[15px] font-semibold text-text-base">Add Block</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-surface-raised text-muted" aria-label="Close add block panel" title="Close (Esc)"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 pb-3">
          <label className="relative block">
            <span className="sr-only">Search blocks</span>
            <Search className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); onAdd(matches[0].id, target, null); } }}
              placeholder="Search blocks…"
              className="w-full h-10 pl-9 pr-3 text-sm border border-border rounded-[8px] bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <p className="mt-2 text-xs text-subtle">
            Click to add to section {target + 1}, or drag onto the page. Add as many as you like.
          </p>
          <p className="mt-0.5 text-xs font-medium text-success min-h-[1rem]" role="status" aria-live="polite">
            {lastAdded ? `Added ${lastAdded} to section ${target + 1}.` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Category rail */}
        <div
          ref={railRef}
          role="tablist"
          aria-label="Block categories"
          aria-orientation="vertical"
          onKeyDown={railKeys}
          className={`w-[124px] shrink-0 border-r border-border py-2 px-1.5 overflow-y-auto ${searching ? 'opacity-50' : ''}`}
        >
          {BLOCK_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const active = !searching && cat === category;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                data-cat={cat}
                aria-selected={active}
                aria-controls="block-picker-tiles"
                tabIndex={cat === category ? 0 : -1}
                onClick={() => { setQuery(''); setCategory(cat); }}
                className={`w-full flex items-center gap-2 px-2 min-h-[40px] rounded-md text-left text-[12px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'bg-primary-light text-primary' : 'text-muted hover:bg-surface-raised hover:text-text-base'}`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span className="leading-tight">{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Tiles */}
        <section id="block-picker-tiles" role="tabpanel" aria-label={searching ? 'Search results' : category} className="flex-1 min-w-0 overflow-y-auto p-3">
          <h3 className="px-0.5 mb-2 text-[13px] font-semibold text-text-base">{searching ? `Results (${matches.length})` : category}</h3>
          {shown.length === 0 && <p className="px-0.5 text-sm text-muted">No blocks match “{query}”.</p>}
          <ul className="grid grid-cols-3 gap-2">
            {shown.map((b) => <li key={b.id}><Tile block={b} onAdd={onAdd} target={target} /></li>)}
          </ul>
        </section>
      </div>
    </aside>
  );
}
