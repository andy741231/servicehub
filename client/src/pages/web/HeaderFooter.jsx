/**
 * HeaderFooter.jsx
 * Edit the SHARED site header and footer (stored on the "home" page).
 * All public pages read header/footer from the home page record, so changes
 * here propagate everywhere automatically.
 */
import { useState, useEffect, useRef } from 'react';
import { Save, Check, AlertCircle, Plus, Trash2, GripVertical, Globe, RefreshCw, Upload } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import ColorPicker from '../../components/ColorPicker';

const resolveUrl = (url) => {
  if (!url) return '';
  url = url.replace(/['"]/g, ''); // Strip quotes
  // Convert same-origin absolute URLs to relative paths
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === window.location.hostname) return parsed.pathname + parsed.search + parsed.hash;
    } catch (e) { /* fall through */ }
    return url;
  }
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
};

// ── Default shapes ──────────────────────────────────────────────────────────

const DEFAULT_HEADER = {
  logo:       { text: '', imageUrl: '', width: '', height: '', padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  styles:     { backgroundColor: 'hsl(var(--surface))', textColor: 'hsl(var(--text-base))' },
};

const DEFAULT_FOOTER = {
  copyright:  '',
  styles:     { backgroundColor: 'hsl(var(--surface-raised))', textColor: 'hsl(var(--text-muted))' },
  sections:   [],
};

// ── Small reusable field ────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`input-field ${mono ? 'font-mono' : ''}`}
    />
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-text-base">{label}</span>
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
          className="w-24 px-2 py-1 text-xs font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

// ── Section card used for footer contact sections ───────────────────────────

const SECTION_TYPES = [
  { id: 'contact-info',  label: 'Contact Info'  },
  { id: 'contact-form',  label: 'Contact Form'  },
  { id: 'links',         label: 'Links'         },
  { id: 'text',          label: 'Text Block'    },
];

function FooterSectionEditor({ section, onChange, onDelete }) {
  const update = (key, val) => onChange({ ...section, [key]: val });

  return (
    <div className="bg-surface-raised border border-border rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-subtle" />
          <select
            value={section.type}
            onChange={e => update('type', e.target.value)}
            className="text-sm border border-border rounded-base px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={onDelete} className="p-3 min-w-[44px] min-h-[44px] hover:bg-danger-light text-danger rounded-base" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <TextInput value={section.title || ''} onChange={v => update('title', v)} placeholder="Section heading (optional)" />

      {section.type === 'contact-info' && (
        <div className="space-y-2">
          <TextInput value={section.email   || ''} onChange={v => update('email',   v)} placeholder="Email address" />
          <TextInput value={section.phone   || ''} onChange={v => update('phone',   v)} placeholder="Phone number" />
          <TextInput value={section.address || ''} onChange={v => update('address', v)} placeholder="Street address" />
        </div>
      )}

      {section.type === 'text' && (
        <textarea
          value={section.content || ''}
          onChange={e => update('content', e.target.value)}
          rows={3}
          placeholder="Text content…"
          className="textarea-field"
        />
      )}

      {section.type === 'links' && (
        <div className="space-y-2">
          {(section.links || []).map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={e => { const ls = [...(section.links||[])]; ls[i] = { ...ls[i], label: e.target.value }; update('links', ls); }}
                placeholder="Label"
                className="input-field flex-1"
              />
              <input
                type="text"
                value={link.href}
                onChange={e => { const ls = [...(section.links||[])]; ls[i] = { ...ls[i], href: e.target.value }; update('links', ls); }}
                placeholder="URL"
                className="input-field flex-1 font-mono"
              />
              <button
                onClick={() => update('links', (section.links||[]).filter((_,j) => j !== i))}
                className="p-1 text-danger hover:bg-danger-light rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => update('links', [...(section.links||[]), { label: '', href: '' }])}
            className="text-xs text-primary hover:text-primary flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Link
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function HeaderFooter() {
  const [header,   setHeader]   = useState(DEFAULT_HEADER);
  const [footer,   setFooter]   = useState(DEFAULT_FOOTER);
  const [original, setOriginal] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('header'); // 'header' | 'footer'
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const logoFileInput = useRef(null);

  const { toast, ToastMount } = useToast();

  useEffect(() => {
    api.get('/web/home').then(({ data }) => {
      const h = data.header || DEFAULT_HEADER;
      const f = data.footer || DEFAULT_FOOTER;
      const merged = {
        header: { ...DEFAULT_HEADER, ...h, logo: { ...DEFAULT_HEADER.logo, ...(h.logo||{}) }, styles: { ...DEFAULT_HEADER.styles, ...(h.styles||{}) } },
        footer: { ...DEFAULT_FOOTER, ...f, styles: { ...DEFAULT_FOOTER.styles, ...(f.styles||{}) }, sections: f.sections || [] },
      };
      // Ensure logo width/height and spacing exist on legacy records
      merged.header.logo.width  = merged.header.logo.width  ?? '';
      merged.header.logo.height = merged.header.logo.height ?? '';
      merged.header.logo.padding = { top: 0, right: 0, bottom: 0, left: 0, ...(merged.header.logo.padding || {}) };
      merged.header.logo.margin  = { top: 0, right: 0, bottom: 0, left: 0, ...(merged.header.logo.margin  || {}) };
      setHeader(merged.header);
      setFooter(merged.footer);
      setOriginal(merged);
    }).catch(() => {
      setOriginal({ header: DEFAULT_HEADER, footer: DEFAULT_FOOTER });
    }).finally(() => setLoading(false));
  }, []);

  const isDirty = original && JSON.stringify({ header, footer }) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/web/home', { header, footer });
      const snap = { header, footer };
      setOriginal(snap);
      toast('Header & footer saved.');
    } catch {
      toast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!original) return;
    setHeader(original.header);
    setFooter(original.footer);
  };

  const updateHeader = (key, val) => setHeader(h => ({ ...h, [key]: val }));
  const updateFooter = (key, val) => setFooter(f => ({ ...f, [key]: val }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/web/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateHeader('logo', { ...header.logo, imageUrl: res.data.url });
      toast('Logo uploaded.');
    } catch (err) {
      setLogoUploadError(err?.response?.data?.error || 'Upload failed.');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const updateSection = (i, val) => setFooter(f => {
    const sections = [...f.sections];
    sections[i] = val;
    return { ...f, sections };
  });
  const deleteSection = (i) => setFooter(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }));
  const addSection    = () => setFooter(f => ({ ...f, sections: [...f.sections, { type: 'contact-info', title: '' }] }));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-surface-tertiary rounded w-40" />
        <div className="h-64 bg-surface-raised rounded-card" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <PageHeader>
        {isDirty && (
          <button onClick={handleReset} className="btn-ghost">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="btn-primary"
        >
            {saving
              ? <AlertCircle className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
      </PageHeader>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-surface-raised p-1 rounded-card mb-6 w-fit">
        {[{ id: 'header', label: 'Header' }, { id: 'footer', label: 'Footer' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-sm font-medium rounded-base transition-colors ${
              tab === t.id ? 'bg-surface text-text-base shadow-sm' : 'text-muted hover:text-text-base'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HEADER TAB ── */}
      {tab === 'header' && (
        <div className="space-y-5">
          {/* Live preview */}
          <div
            className="rounded-card overflow-hidden border border-border px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: header.styles?.backgroundColor, color: header.styles?.textColor }}
          >
            <div className="flex items-center gap-2 font-bold text-lg">
              {header.logo?.imageUrl ? (
                <img
                  src={resolveUrl(header.logo.imageUrl)}
                  alt={header.logo?.text || 'Logo'}
                  style={{
                    width: header.logo?.width ? `${header.logo.width}px` : 'auto',
                    height: header.logo?.height ? `${header.logo.height}px` : '32px',
                    padding: `${header.logo?.padding?.top ?? 0}px ${header.logo?.padding?.right ?? 0}px ${header.logo?.padding?.bottom ?? 0}px ${header.logo?.padding?.left ?? 0}px`,
                    margin: `${header.logo?.margin?.top ?? 0}px ${header.logo?.margin?.right ?? 0}px ${header.logo?.margin?.bottom ?? 0}px ${header.logo?.margin?.left ?? 0}px`,
                  }}
                  className="w-auto object-contain"
                />
              ) : (
                <Globe className="w-5 h-5 opacity-60" />
              )}
              {header.logo?.text || ''}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-card divide-y divide-border-soft">
            <div className="px-5 py-4 space-y-4">
              <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Logo</h2>
              <Field label="Site Name" hint="Shown in the header when no logo image is set.">
                <TextInput
                  value={header.logo?.text || ''}
                  onChange={v => updateHeader('logo', { ...header.logo, text: v })}
                  placeholder="My Company"
                />
              </Field>
              <Field label="Logo Image" hint="Upload a file or paste a URL. When set, the image is used instead of the site name.">
                <div className="flex items-center gap-2">
                  <TextInput
                    value={header.logo?.imageUrl || ''}
                    onChange={v => updateHeader('logo', { ...header.logo, imageUrl: v })}
                    placeholder="https://…"
                    mono
                  />
                  <input
                    ref={logoFileInput}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => logoFileInput.current?.click()}
                    disabled={logoUploading}
                    className="flex-shrink-0 px-3 py-2 border border-border-strong rounded-base text-sm hover:bg-surface-raised disabled:opacity-50 flex items-center gap-1.5"
                    title="Upload logo"
                  >
                    {logoUploading ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {logoUploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                {logoUploadError && <p className="text-xs text-danger mt-1">{logoUploadError}</p>}
                {header.logo?.imageUrl && (
                  <img
                    src={resolveUrl(header.logo.imageUrl)}
                    alt="Logo preview"
                    className="mt-2 h-8 w-auto object-contain rounded border border-border"
                    onError={e => { e.target.style.display = 'none'; }}
                    onLoad={e => { e.target.style.display = ''; }}
                  />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Logo Width" hint="Optional. Pixels.">
                  <input
                    type="number"
                    min={0}
                    value={header.logo?.width ?? ''}
                    onChange={e => updateHeader('logo', { ...header.logo, width: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    placeholder="Auto"
                    className="input-field"
                  />
                </Field>
                <Field label="Logo Height" hint="Optional. Pixels.">
                  <input
                    type="number"
                    min={0}
                    value={header.logo?.height ?? ''}
                    onChange={e => updateHeader('logo', { ...header.logo, height: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    placeholder="Auto"
                    className="input-field"
                  />
                </Field>
              </div>

              <div className="space-y-3">
                <Field label="Logo Padding" hint="Pixels. Top, right, bottom, left.">
                  <div className="grid grid-cols-4 gap-2">
                    {['top', 'right', 'bottom', 'left'].map(side => (
                      <div key={side}>
                        <label className="block text-[10px] uppercase text-muted tracking-wide mb-0.5">{side}</label>
                        <input
                          type="number"
                          min={0}
                          value={header.logo?.padding?.[side] ?? 0}
                          onChange={e => updateHeader('logo', {
                            ...header.logo,
                            padding: { ...header.logo.padding, [side]: e.target.value === '' ? 0 : parseInt(e.target.value, 10) }
                          })}
                          className="input-field"
                        />
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Logo Margin" hint="Pixels. Top, right, bottom, left.">
                  <div className="grid grid-cols-4 gap-2">
                    {['top', 'right', 'bottom', 'left'].map(side => (
                      <div key={side}>
                        <label className="block text-[10px] uppercase text-muted tracking-wide mb-0.5">{side}</label>
                        <input
                          type="number"
                          min={0}
                          value={header.logo?.margin?.[side] ?? 0}
                          onChange={e => updateHeader('logo', {
                            ...header.logo,
                            margin: { ...header.logo.margin, [side]: e.target.value === '' ? 0 : parseInt(e.target.value, 10) }
                          })}
                          className="input-field"
                        />
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Colors</h2>
              <ColorRow
                label="Background"
                value={header.styles?.backgroundColor || 'hsl(var(--surface))'}
                onChange={v => updateHeader('styles', { ...header.styles, backgroundColor: v })}
              />
              <ColorRow
                label="Text / Links"
                value={header.styles?.textColor || 'hsl(var(--text-base))'}
                onChange={v => updateHeader('styles', { ...header.styles, textColor: v })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER TAB ── */}
      {tab === 'footer' && (
        <div className="space-y-5">
          {/* Live preview */}
          <div
            className="rounded-card overflow-hidden border border-border px-6 py-5"
            style={{ backgroundColor: footer.styles?.backgroundColor, color: footer.styles?.textColor }}
          >
            <p className="text-xs text-center opacity-60 mt-2">
              {footer.copyright || '© Your Company. All rights reserved.'}
            </p>
          </div>

          <div className="bg-surface border border-border rounded-card divide-y divide-border-soft">
            <div className="px-5 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Colors</h2>
              <ColorRow
                label="Background"
                value={footer.styles?.backgroundColor || 'hsl(var(--surface-raised))'}
                onChange={v => updateFooter('styles', { ...footer.styles, backgroundColor: v })}
              />
              <ColorRow
                label="Text"
                value={footer.styles?.textColor || 'hsl(var(--text-muted))'}
                onChange={v => updateFooter('styles', { ...footer.styles, textColor: v })}
              />
            </div>

            <div className="px-5 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Copyright</h2>
              <Field label="Copyright line" hint="Supports basic HTML like &amp;copy;.">
                <TextInput
                  value={footer.copyright || ''}
                  onChange={v => updateFooter('copyright', v)}
                  placeholder={`© ${new Date().getFullYear()} My Company. All rights reserved.`}
                />
              </Field>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-base uppercase tracking-wide">Sections</h2>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>
              {footer.sections.length === 0 ? (
                <p className="text-sm text-subtle italic">No sections yet. Add one above.</p>
              ) : (
                <div className="space-y-3">
                  {footer.sections.map((section, i) => (
                    <FooterSectionEditor
                      key={i}
                      section={section}
                      onChange={val => updateSection(i, val)}
                      onDelete={() => deleteSection(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {ToastMount}
    </div>
  );
}
