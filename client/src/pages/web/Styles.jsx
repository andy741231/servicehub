import { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import ColorPicker from '../../components/ColorPicker';
import { DEFAULT_SITE_TOKENS, siteColorPresets, normalizeHex } from '../../site/siteTheme';
import { clearSiteColorPresets } from './useSiteColorPresets';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Raleway', 'Playfair Display', 'Merriweather', 'Source Sans 3',
  'Nunito', 'DM Sans', 'Outfit', 'Libre Baskerville',
];

// One source of defaults on the client (site/siteTheme.js), incl. the palette.
export const DEFAULT_TOKENS = DEFAULT_SITE_TOKENS;

function ColorSwatch({ label, value, onChange, presets }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border-soft last:border-0">
      <div>
        <p className="text-sm font-medium text-text-base">{label}</p>
        <p className="text-xs text-subtle font-mono">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        <ColorPicker
          value={value}
          onChange={onChange}
          label={label}
          allowAlpha={false}
          presets={presets}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-24 px-2 py-1.5 text-xs font-mono border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

// ── Color palette ──────────────────────────────────────────────────────────
// Extra brand colors offered as presets in every site color picker. Blocks
// and sections store the literal hex they were given, so editing or deleting
// a palette color never changes existing content.
const paletteError = (e) => (!String(e.name || '').trim() ? 'Give this color a name' : !normalizeHex(e.value) ? 'Use a hex color like #1a2b3c' : null);
const nextColorName = (palette) => {
  const used = new Set(palette.map((e) => e.name));
  let n = palette.length + 1;
  while (used.has(`Color ${n}`)) n += 1;
  return `Color ${n}`;
};

function PaletteRow({ entry, index, presets, onChange, onDelete }) {
  const err = paletteError(entry);
  const hex = normalizeHex(entry.value);
  return (
    <div className="py-2.5 border-b border-border-soft last:border-0">
      <div className="flex items-center gap-2">
        <ColorPicker value={hex || '#000000'} onChange={(v) => onChange({ ...entry, value: v })} label={entry.name || `Palette color ${index + 1}`} allowAlpha={false} presets={presets} />
        <input
          type="text"
          value={entry.name}
          onChange={(e) => onChange({ ...entry, name: e.target.value })}
          aria-label={`Name of palette color ${index + 1}`}
          placeholder="Color name"
          className="flex-1 min-w-0 h-11 px-3 text-sm border border-border rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="text"
          value={entry.value}
          onChange={(e) => onChange({ ...entry, value: e.target.value })}
          aria-label={`Hex value of ${entry.name || `palette color ${index + 1}`}`}
          spellCheck={false}
          className="w-28 h-11 px-2 text-xs font-mono border border-border rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${entry.name || `palette color ${index + 1}`}`}
          title="Delete (existing content keeps its color)"
          className="w-11 h-11 flex items-center justify-center rounded-base text-muted hover:text-danger hover:bg-danger-light focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-danger" role="alert">{err}</p>}
    </div>
  );
}

export default function Styles() {
  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [original, setOriginal] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/web/styles').then(({ data }) => {
      const t = data.tokens || DEFAULT_TOKENS;
      // Merge with defaults so any missing keys are filled
      const merged = {
        colors:       { ...DEFAULT_TOKENS.colors,       ...(t.colors || {}) },
        fonts:        { ...DEFAULT_TOKENS.fonts,        ...(t.fonts  || {}) },
        spacing:      { ...DEFAULT_TOKENS.spacing,      ...(t.spacing || {}) },
        borderRadius: { ...DEFAULT_TOKENS.borderRadius, ...(t.borderRadius || {}) },
        // Kept as stored (even emptied on purpose); default only when absent.
        palette:      Array.isArray(t.palette) ? t.palette : DEFAULT_TOKENS.palette,
      };
      setTokens(merged);
      setOriginal(merged);
    }).catch(() => {
      setTokens(DEFAULT_TOKENS);
      setOriginal(DEFAULT_TOKENS);
    }).finally(() => setLoading(false));
  }, []);

  const setColor = (key, val) => setTokens(t => ({ ...t, colors: { ...t.colors, [key]: val } }));
  const setFont  = (key, val) => setTokens(t => ({ ...t, fonts:  { ...t.fonts,  [key]: val } }));
  const palette = tokens.palette || [];
  const setPalette = (next) => setTokens(t => ({ ...t, palette: next }));
  const paletteInvalid = palette.some(paletteError);
  // Presets for every picker on this page: theme colors + palette, as edited.
  const presets = siteColorPresets(tokens);

  const handleSave = async () => {
    if (paletteInvalid) return;
    setSaveStatus('saving');
    const toSave = { ...tokens, palette: palette.map((e) => ({ name: e.name.trim(), value: normalizeHex(e.value) })) };
    try {
      await api.put('/web/styles', { tokens: toSave });
      setTokens(toSave);
      setOriginal(toSave);
      clearSiteColorPresets(); // other screens pick up the new colors
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => setTokens(original || DEFAULT_TOKENS);

  const isDirty = JSON.stringify(tokens) !== JSON.stringify(original);

  const colorLabels = {
    primary:    'Primary',
    secondary:  'Secondary',
    accent:     'Accent',
    background: 'Background',
    text:       'Body Text',
    muted:      'Muted Text',
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-surface-tertiary rounded w-32" />
          <div className="h-64 bg-surface-raised rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <PageHeader>
        {isDirty && (
          <button onClick={handleReset} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saveStatus === 'saving' || paletteInvalid}
          title={paletteInvalid ? 'Fix the palette colors marked in red first' : undefined}
          className="btn-primary"
        >
            {saveStatus === 'saving' && <AlertCircle className="w-4 h-4 animate-spin" />}
            {saveStatus === 'saved'  && <Check className="w-4 h-4" />}
            {(saveStatus === 'idle' || saveStatus === 'error') && <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
      </PageHeader>

      <div className="space-y-6">
        {/* Colors */}
        <section className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-soft bg-surface-raised">
            <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Colors</h2>
          </div>
          <div className="px-5 py-2">
            {Object.entries(colorLabels).map(([key, label]) => (
              <ColorSwatch key={key} label={label} value={tokens.colors[key] || '#2563eb'} onChange={v => setColor(key, v)} presets={presets} />
            ))}
          </div>

          {/* Live preview swatches */}
          <div className="px-5 pb-4">
            <p className="text-xs text-subtle mb-2">Preview</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(tokens.colors).map(([key, val]) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: val }} title={val} />
                  <span className="text-xs text-subtle">{colorLabels[key] || key}</span>
                </div>
              ))}
              {palette.filter((e) => normalizeHex(e.value)).map((e, i) => (
                <div key={`p-${i}`} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: normalizeHex(e.value) }} title={normalizeHex(e.value)} />
                  <span className="text-xs text-subtle">{e.name || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Color palette */}
        <section className="bg-surface border border-border rounded-card overflow-hidden" aria-labelledby="palette-heading">
          <div className="px-5 py-3.5 border-b border-border-soft bg-surface-raised flex items-center justify-between gap-3">
            <div>
              <h2 id="palette-heading" className="text-sm font-semibold text-text-base uppercase tracking-wide">Color palette</h2>
              <p className="text-xs text-subtle mt-0.5 normal-case tracking-normal">Brand colors offered as presets wherever you pick a color. Blocks keep the color they were given — removing one here never changes existing content.</p>
            </div>
            <button
              type="button"
              onClick={() => setPalette([...palette, { name: nextColorName(palette), value: normalizeHex(palette.at(-1)?.value) || tokens.colors.primary || '#152b45' }])}
              className="btn-secondary shrink-0"
            >
              <Plus className="w-4 h-4" /> Add color
            </button>
          </div>
          <div className="px-5 py-2">
            {palette.length === 0 ? (
              <p className="py-4 text-sm text-muted">No palette colors. Add your brand colors — they’ll appear as presets everywhere you pick a color.</p>
            ) : palette.map((entry, i) => (
              <PaletteRow
                key={i}
                entry={entry}
                index={i}
                presets={presets}
                onChange={(next) => setPalette(palette.map((e, j) => (j === i ? next : e)))}
                onDelete={() => setPalette(palette.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-soft bg-surface-raised">
            <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Typography</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[{ key: 'heading', label: 'Heading Font' }, { key: 'body', label: 'Body Font' }, { key: 'serif', label: 'Serif Font' }].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-text-base mb-1.5">{label}</label>
                <select
                  value={tokens.fonts[key]?.split(',')[0]?.trim() || 'Inter'}
                  onChange={e => setFont(key, `${e.target.value}, sans-serif`)}
                  className="w-full px-3 py-2 border border-border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <p className="text-xs text-subtle mt-1 font-mono">{tokens.fonts[key]}</p>
              </div>
            ))}

            {/* Font preview */}
            <div className="p-4 bg-surface-raised rounded-base space-y-2">
              <p className="text-xs text-subtle mb-2">Preview</p>
              <p className="text-2xl font-bold text-text-base" style={{ fontFamily: tokens.fonts.heading }}>
                The quick brown fox
              </p>
              <p className="text-base text-muted" style={{ fontFamily: tokens.fonts.body }}>
                Jumps over the lazy dog. 0123456789
              </p>
            </div>
          </div>
        </section>

        {/* Spacing & Radius */}
        <section className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-soft bg-surface-raised">
            <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Spacing & Shape</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text-base">Base Spacing</label>
                <span className="text-sm font-mono text-muted">{tokens.spacing.base}px</span>
              </div>
              <input
                type="range" min={8} max={32} step={2}
                value={tokens.spacing.base}
                onChange={e => setTokens(t => ({ ...t, spacing: { ...t.spacing, base: Number(e.target.value) } }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-subtle mt-0.5"><span>8px</span><span>32px</span></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text-base">Border Radius</label>
                <span className="text-sm font-mono text-muted">{tokens.borderRadius.default}px</span>
              </div>
              <input
                type="range" min={0} max={24} step={2}
                value={tokens.borderRadius.default}
                onChange={e => setTokens(t => ({ ...t, borderRadius: { ...t.borderRadius, default: Number(e.target.value) } }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-subtle mt-0.5"><span>0 (square)</span><span>24px (pill)</span></div>

              {/* Radius preview */}
              <div className="mt-3 flex gap-3 items-center">
                <div
                  className="w-16 h-10 bg-primary"
                  style={{ borderRadius: tokens.borderRadius.default }}
                />
                <div
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium"
                  style={{ borderRadius: tokens.borderRadius.default }}
                >
                  Button
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
