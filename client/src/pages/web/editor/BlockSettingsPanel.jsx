/**
 * Block content settings (shown in the editor inspector's Content tab) —
 * settings that can't be edited in place on the canvas:
 * URLs, styles, toggles, and removing/reordering list items. Text, images and
 * link labels are edited directly on the block (see siteEditBridge.jsx).
 *
 */
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

const BUTTON_VARIANTS = [['gold', 'Gold'], ['outline', 'Outline'], ['default', 'Navy']];

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Per block type: non-inline settings. `list` entries manage array items. */
export const BLOCK_SETTINGS = {
  hero: [{ key: 'backgroundImage', label: 'Background image URL', type: 'text', placeholder: 'https://… or uploaded file name' }],
  'trust-bar': [{ key: 'items', label: 'Items', type: 'list', summary: (i) => `${i.number || ''} ${stripTags(i.label)}` }],
  'split-banner': [
    { key: 'buttonLink', label: 'Button link', type: 'text', placeholder: '/contact' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS },
    { key: 'times', label: 'Service times', type: 'list', summary: (t) => `${t.label || ''} — ${t.value || ''}` },
  ],
  events: [{ key: 'items', label: 'Events', type: 'list', summary: (e) => `${e.date || ''} · ${stripTags(e.title)}` }],
  quote: [{ key: 'backgroundColor', label: 'Background color', type: 'text', placeholder: '#eadfc9' }],
  map: [
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'embedUrl', label: 'Map embed URL (optional)', type: 'text', placeholder: 'https://www.google.com/maps/embed?…' },
  ],
  intro: [
    { key: 'buttonLink', label: 'Button link', type: 'text', placeholder: '/about' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS },
  ],
  features: [
    { key: 'numbered', label: 'Show numbers instead of icons', type: 'checkbox' },
    { key: 'items', label: 'Features', type: 'list', summary: (f) => stripTags(f.title) },
  ],
  highlights: [{ key: 'items', label: 'Highlights', type: 'list', summary: (h) => stripTags(h.title) }],
  gallery: [{ key: 'images', label: 'Images', type: 'list', summary: (g, i) => stripTags(g.caption) || g.url || `Image ${i + 1}` }],
  testimonials: [{
    key: 'testimonials', label: 'Testimonials', type: 'list', summary: (t) => stripTags(t.name),
    itemFields: [{ key: 'avatar', label: 'Avatar URL' }],
  }],
  contact: [
    { key: 'showForm', label: 'Show contact form', type: 'checkbox' },
    { key: 'reasonOptions', label: 'Form reasons (comma separated)', type: 'csv' },
    { key: 'emailLabel', label: 'Email label', type: 'text', placeholder: 'Email' },
    { key: 'phoneLabel', label: 'Phone label', type: 'text', placeholder: 'Phone' },
    { key: 'addressLabel', label: 'Address label', type: 'text', placeholder: 'Address' },
    { key: 'buttonVariant', label: 'Form button style', type: 'select', options: BUTTON_VARIANTS },
  ],
  video: [{ key: 'videoUrl', label: 'YouTube or Vimeo URL', type: 'text', placeholder: 'https://www.youtube.com/watch?v=…' }],
};

export const hasBlockSettings = (type) => (BLOCK_SETTINGS[type] || []).length > 0;

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary';

// Comma-separated list. Keeps its own text while typing (re-joining on every
// keystroke would swallow a trailing ", ") and commits on blur / Enter.
function CsvInput({ value, onCommit }) {
  const joined = value.join(', ');
  const [text, setText] = useState(joined);
  useEffect(() => { setText(joined); }, [joined]);
  const commit = () => onCommit(text.split(',').map((s) => s.trim()).filter(Boolean));
  return (
    <input
      className={`${inputCls} mt-1`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
    />
  );
}

function ListField({ field, items, onChange }) {
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="text-xs font-medium text-muted mb-1.5">{field.label}</div>
      {items.length === 0 && <p className="text-xs text-subtle italic">None yet — use “+ Add” on the block.</p>}
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="border border-border rounded-md p-2">
            <div className="flex items-center gap-1">
              <span className="flex-1 text-sm text-text-base truncate" title={field.summary(item, i)}>{field.summary(item, i) || `Item ${i + 1}`}</span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-surface-raised disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1 rounded hover:bg-surface-raised disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-danger-light text-danger" aria-label="Remove item"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {field.itemFields?.map((f) => (
              <label key={f.key} className="block mt-1.5 text-xs text-muted">{f.label}
                <input
                  className={`${inputCls} mt-0.5`}
                  value={item[f.key] || ''}
                  onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, [f.key]: e.target.value } : it)))}
                />
              </label>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Human-readable block type name, e.g. "split-banner" → "Split banner". */
export const blockTypeLabel = (type) => {
  const t = String(type || 'block').replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** The settings form for one block (labels wrap their inputs). */
export function BlockContentSettings({ block, onUpdateContent }) {
  const fields = BLOCK_SETTINGS[block.type] || [];
  const c = block.content || {};
  const set = (key, value) => onUpdateContent({ [key]: value });

  if (fields.length === 0) {
    return <p className="text-sm text-muted">Everything in this block is edited directly on the page — click its text to type.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-subtle">Text, images and button labels are edited directly on the block.</p>
      {fields.map((f) => {
        if (f.type === 'list') return <ListField key={f.key} field={f} items={c[f.key] || []} onChange={(v) => set(f.key, v)} />;
        if (f.type === 'checkbox') {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm text-text-base">
              <input type="checkbox" checked={c[f.key] === true} onChange={(e) => set(f.key, e.target.checked)} />
              {f.label}
            </label>
          );
        }
        if (f.type === 'select') {
          return (
            <label key={f.key} className="block text-xs font-medium text-muted">{f.label}
              <select className={`${inputCls} mt-1`} value={c[f.key] || f.options[0][0]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          );
        }
        if (f.type === 'csv') {
          return (
            <label key={f.key} className="block text-xs font-medium text-muted">{f.label}
              <CsvInput value={c[f.key] || []} onCommit={(v) => set(f.key, v)} />
            </label>
          );
        }
        return (
          <label key={f.key} className="block text-xs font-medium text-muted">{f.label}
            <input className={`${inputCls} mt-1`} value={c[f.key] || ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
          </label>
        );
      })}
    </div>
  );
}
