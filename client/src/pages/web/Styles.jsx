import { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import ColorPicker from '../../components/ColorPicker';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Raleway', 'Playfair Display', 'Merriweather', 'Source Sans 3',
  'Nunito', 'DM Sans', 'Outfit', 'Libre Baskerville',
];

const DEFAULT_TOKENS = {
  colors: {
    primary:    '#2563eb',
    secondary:  '#7c3aed',
    accent:     '#f59e0b',
    background: '#ffffff',
    text:       '#111827',
    muted:      '#6b7280',
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body:    'Inter, sans-serif',
  },
  spacing: { base: 16 },
  borderRadius: { default: 8 },
};

function ColorSwatch({ label, value, onChange }) {
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

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await api.put('/web/styles', { tokens });
      setOriginal(tokens);
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
          disabled={!isDirty || saveStatus === 'saving'}
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
              <ColorSwatch key={key} label={label} value={tokens.colors[key] || '#2563eb'} onChange={v => setColor(key, v)} />
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
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-soft bg-surface-raised">
            <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Typography</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[{ key: 'heading', label: 'Heading Font' }, { key: 'body', label: 'Body Font' }].map(({ key, label }) => (
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
