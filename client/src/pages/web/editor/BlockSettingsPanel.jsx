/**
 * Block content settings (shown in the editor inspector's Content tab) —
 * settings that can't be edited in place on the canvas:
 * URLs, styles, toggles, and removing/reordering list items. Text, images and
 * link labels are edited directly on the block (see siteEditBridge.jsx).
 *
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Upload, Loader2, Images } from 'lucide-react';
import api from '../../../utils/api';
import { blockCatalogEntry } from './editorUtils';
import AssetLibrary from './AssetLibrary';

const BUTTON_VARIANTS = [['gold', 'Gold'], ['outline', 'Outline'], ['default', 'Navy']];

const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Per block type: non-inline settings. `list` entries manage array items. */
export const BLOCK_SETTINGS = {
  hero: [
    { key: 'backgroundImage', label: 'Background image', type: 'image' },
    { key: 'buttonLink', label: 'Button link (type the button label on the block)', type: 'text', placeholder: '/visit' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS },
  ],
  image: [
    { key: 'url', label: 'Image', type: 'image' },
    { key: 'alt', label: 'Alt text (describes the image for people using screen readers)', type: 'text', placeholder: 'e.g. Families sharing a meal in the courtyard' },
    { key: 'fit', label: 'Sizing', type: 'select', options: [['cover', 'Fill the block (crops the edges)'], ['contain', 'Show the whole image']] },
    { key: 'focus', label: 'Keep in view when cropping', type: 'select', options: [['center', 'Center'], ['top', 'Top'], ['bottom', 'Bottom'], ['left', 'Left'], ['right', 'Right']] },
    { key: 'caption', label: 'Caption (optional)', type: 'text' },
    { key: 'link', label: 'Link (optional)', type: 'text', placeholder: '/about or https://…' },
  ],
  button: [
    { key: 'buttonLink', label: 'Button link (type the label on the block)', type: 'text', placeholder: '/give' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS },
    { key: 'align', label: 'Alignment', type: 'select', options: [['center', 'Center'], ['left', 'Left'], ['right', 'Right']] },
  ],
  carousel: [
    { key: 'aspect', label: 'Shape', type: 'select', options: [['wide', 'Wide 16:9'], ['landscape', 'Landscape 4:3'], ['tall', 'Portrait 3:4'], ['fill', 'Fill the block']] },
    { key: 'autoplay', label: 'Advance automatically (pauses on hover; off for people who prefer reduced motion)', type: 'checkbox' },
    { key: 'interval', label: 'Seconds per slide', type: 'select', options: [['6', '6'], ['4', '4'], ['8', '8'], ['10', '10']] },
    {
      key: 'slides', label: 'Slides', type: 'list', summary: (sl, i) => stripTags(sl.title) || `Slide ${i + 1}`,
      itemFields: [{ key: 'alt', label: 'Image alt text (blank = the title)' }],
    },
  ],
  divider: [
    { key: 'style', label: 'Style', type: 'select', options: [['line', 'Line'], ['dots', 'Dots'], ['space', 'Empty space (spacer)']] },
    { key: 'width', label: 'Line width', type: 'select', options: [['full', 'Full width'], ['short', 'Short, centred']] },
  ],
  'trust-bar': [{ key: 'items', label: 'Items', type: 'list', summary: (i) => `${i.number || ''} ${stripTags(i.label)}` }],
  'split-banner': [
    { key: 'buttonLink', label: 'Button link', type: 'text', placeholder: '/contact' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS },
    { key: 'times', label: 'Service times', type: 'list', summary: (t) => `${t.label || ''} — ${t.value || ''}` },
  ],
  events: [{ key: 'items', label: 'Events', type: 'list', summary: (e) => `${e.date || ''} · ${stripTags(e.title)}` }],
  // Quote background is set in the Design tab (one place for every block).
  quote: [
    { key: 'buttonLink', label: 'Button link (type the button label on the block)', type: 'text', placeholder: '/visit' },
    { key: 'buttonVariant', label: 'Button style', type: 'select', options: BUTTON_VARIANTS, default: 'outline' },
  ],
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
  highlights: [{
    key: 'items', label: 'Highlights', type: 'list', summary: (h) => stripTags(h.title),
    itemFields: [{ key: 'imageAlt', label: 'Image alt text (blank = the title)' }],
  }],
  gallery: [
    { key: 'layout', label: 'Layout', type: 'select', options: [['photos', 'Photo grid'], ['logos', 'Logo strip (whole images, small, greyscale)']] },
    { key: 'columns', label: 'Columns on wide screens', type: 'select', options: [['', 'Automatic'], ['2', '2'], ['3', '3'], ['4', '4'], ['6', '6']] },
    { key: 'aspect', label: 'Photo shape', type: 'select', options: [['', 'Same height (default)'], ['landscape', 'Landscape 4:3'], ['square', 'Square'], ['portrait', 'Portrait 3:4'], ['wide', 'Wide 16:9']] },
  {
    key: 'images', label: 'Images', type: 'list', summary: (g, i) => stripTags(g.caption) || g.alt || `Image ${i + 1}`,
    itemFields: [{ key: 'alt', label: 'Alt text (describes the image for screen readers)' }],
  }],
  testimonials: [{
    key: 'testimonials', label: 'Testimonials', type: 'list', summary: (t) => stripTags(t.name),
    itemFields: [{ key: 'avatar', label: 'Avatar URL' }],
  }],
  contact: [
    { key: 'formId', label: 'Form (from the Forms app)', type: 'hubForm' },
    { key: 'emailLabel', label: 'Email label', type: 'text', placeholder: 'Email' },
    { key: 'phoneLabel', label: 'Phone label', type: 'text', placeholder: 'Phone' },
    { key: 'addressLabel', label: 'Address label', type: 'text', placeholder: 'Address' },
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

/**
 * Image setting (e.g. a hero background): preview, upload to the asset
 * library, or paste an address. Uploading used to be impossible here — the
 * only option was typing a URL.
 */
export function ImageField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState(value || '');
  const [showLibrary, setShowLibrary] = useState(false);
  useEffect(() => { setText(value || ''); }, [value]);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/web/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.url);
    } catch {
      setError('Upload failed — check the file type and size.');
    } finally { setBusy(false); }
  };
  const commit = () => { if (text.trim() !== (value || '')) onChange(text.trim() || undefined); };
  return (
    <div>
      <div className="text-xs font-medium text-muted mb-1">{label}</div>
      {value && <img src={value} alt="" className="w-full h-28 object-cover rounded-md border border-border mb-2" />}
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[36px] text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {value ? 'Replace' : 'Upload image'}
        </button>
        <button type="button" onClick={() => setShowLibrary((v) => !v)} aria-expanded={showLibrary} className={`px-3 py-2 min-h-[36px] text-sm rounded-md border inline-flex items-center gap-1.5 ${showLibrary ? 'border-primary text-primary bg-primary-light' : 'border-border text-muted hover:bg-surface-raised'}`} title="Choose an image you've already uploaded"><Images className="w-4 h-4" /> Library</button>
        {value && <button type="button" onClick={() => onChange(undefined)} className="px-3 py-2 min-h-[36px] text-sm rounded-md border border-border text-muted hover:bg-surface-raised">Remove</button>}
      </div>
      {showLibrary && <div className="mt-2"><AssetLibrary selected={value} onPick={(url) => { onChange(url); setShowLibrary(false); }} /></div>}
      <input
        className={`${inputCls} mt-2`}
        value={text}
        placeholder="or paste an image address"
        aria-label={`${label} URL`}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      />
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={upload} className="hidden" aria-hidden="true" tabIndex={-1} />
    </div>
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
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised disabled:opacity-30" aria-label="Move up" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-raised disabled:opacity-30" aria-label="Move down" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center rounded hover:bg-danger-light text-danger" aria-label="Remove item" title="Remove item"><Trash2 className="w-3.5 h-3.5" /></button>
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

/**
 * Pick a form from the Hub's Forms app (GET /api/forms). Stores its id (the
 * stable key; slugs live inside each form) and title for display.
 */
function HubFormField({ label, value, onPick }) {
  const [forms, setForms] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    api.get('/forms')
      .then(({ data }) => { if (alive) setForms((data?.forms || data || []).map((f) => ({ id: f.id, title: f.title || 'Untitled form' }))); })
      .catch(() => { if (alive) { setForms([]); setError('Could not load forms.'); } });
    return () => { alive = false; };
  }, []);
  const missing = value && forms && !forms.some((f) => f.id === value);
  return (
    <div>
      <label className="block text-xs font-medium text-muted">{label}
        <select
          className={`${inputCls} mt-1`}
          value={value || ''}
          disabled={!forms}
          onChange={(e) => { const f = forms.find((x) => x.id === e.target.value); onPick(f ? { formId: f.id, formTitle: f.title } : { formId: undefined, formTitle: undefined }); }}
        >
          <option value="">{forms ? 'No form' : 'Loading forms…'}</option>
          {(forms || []).map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
      </label>
      {missing && <p className="mt-1 text-xs text-danger" role="alert">The chosen form was deleted — pick another.</p>}
      {error && <p className="mt-1 text-xs text-danger" role="alert">{error}</p>}
      <p className="mt-1 text-xs text-subtle">
        Submissions go to Forms → Submissions. <a href="/hub-admin/forms" target="_blank" rel="noreferrer" className="text-primary hover:underline">Create or edit forms</a>
      </p>
    </div>
  );
}

/** Human-readable block type name, e.g. "split-banner" → "Split banner". */
export const blockTypeLabel = (type) => {
  // Same name as the block picker (e.g. split-banner → "Service times");
  // the hover label, inspector and layers used to say "Split banner".
  const named = blockCatalogEntry(type)?.name;
  if (named) return named;
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
        if (f.type === 'image') return <ImageField key={f.key} label={f.label} value={c[f.key]} onChange={(v) => set(f.key, v)} />;
        if (f.type === 'list') return <ListField key={f.key} field={f} items={c[f.key] || []} onChange={(v) => set(f.key, v)} />;
        if (f.type === 'checkbox') {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm text-text-base">
              <input type="checkbox" checked={c[f.key] === true} onChange={(e) => set(f.key, e.target.checked)} />
              {f.label}
            </label>
          );
        }
        if (f.type === 'hubForm') return <HubFormField key={f.key} label={f.label} value={c.formId} onPick={(v) => onUpdateContent(v)} />;
        if (f.type === 'select') {
          return (
            <label key={f.key} className="block text-xs font-medium text-muted">{f.label}
              <select className={`${inputCls} mt-1`} value={c[f.key] || f.default || f.options[0][0]} onChange={(e) => set(f.key, e.target.value)}>
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
