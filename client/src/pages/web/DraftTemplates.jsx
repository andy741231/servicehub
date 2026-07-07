import { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, RefreshCw, Eye, EyeOff, Home, FileX } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import ColorPicker from '../../components/ColorPicker';

const DEFAULT = {
  homeDraft: {
    title: 'Welcome',
    heading: 'Welcome to our site',
    message:
      'This is your public homepage. Open the Web Builder to add pages, edit navigation, and publish your own content.',
    bgColor: '#f9fafb',
    textColor: '#111827',
    accentColor: '#2563eb',
    showLogo: true,
    logoText: '',
    showContactEmail: false,
    contactEmail: '',
  },
  pageDraft: {
    title: 'Page Not Found',
    heading: 'Page Not Found',
    message: "The page you're looking for doesn't exist or is not yet available.",
    bgColor: '#f9fafb',
    textColor: '#111827',
    accentColor: '#2563eb',
    showBackLink: true,
    backLinkLabel: 'Go back home',
    backLinkHref: '/',
  },
};

// ── Live preview components ────────────────────────────────────────────────

function HomeDraftPreview({ t }) {
  return (
    <div
      className="w-full rounded-card overflow-hidden border border-border shadow-sm"
      style={{ backgroundColor: t.bgColor, color: t.textColor, minHeight: 320 }}
    >
      <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-6">
        {t.showLogo && (
          <div
            className="w-12 h-12 rounded-card flex items-center justify-center text-primary-foreground font-bold text-lg"
            style={{ backgroundColor: t.accentColor }}
          >
            {(t.logoText || 'S').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="w-10 h-0.5 mx-auto mb-6" style={{ backgroundColor: t.accentColor }} />
          <h1 className="text-3xl font-bold mb-3" style={{ color: t.textColor }}>
            {t.heading || "We'll be back soon"}
          </h1>
          <p className="text-base max-w-md mx-auto opacity-75" style={{ color: t.textColor }}>
            {t.message}
          </p>
        </div>
        {t.showContactEmail && t.contactEmail && (
          <a
            href={`mailto:${t.contactEmail}`}
            className="text-sm underline opacity-70"
            style={{ color: t.accentColor }}
          >
            {t.contactEmail}
          </a>
        )}
        <p className="text-xs opacity-40" style={{ color: t.textColor }}>
          {t.title}
        </p>
      </div>
    </div>
  );
}

function PageDraftPreview({ t }) {
  return (
    <div
      className="w-full rounded-card overflow-hidden border border-border shadow-sm"
      style={{ backgroundColor: t.bgColor, color: t.textColor, minHeight: 320 }}
    >
      <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: t.accentColor + '18' }}
        >
          <FileX className="w-8 h-8" style={{ color: t.accentColor }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: t.textColor }}>
            {t.heading || 'Page Not Found'}
          </h1>
          <p className="text-base max-w-md mx-auto opacity-75" style={{ color: t.textColor }}>
            {t.message}
          </p>
        </div>
        {t.showBackLink && (
          <span
            className="text-sm font-medium underline"
            style={{ color: t.accentColor }}
          >
            {t.backLinkLabel || 'Go back home'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Field row helpers ──────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-border-soft last:border-0">
      <div>
        <p className="text-sm font-medium text-text-base">{label}</p>
        {hint && <p className="text-xs text-subtle mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, multiline }) {
  if (multiline)
    return (
      <textarea
        rows={3}
        className="textarea-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  return (
    <input
      type="text"
      className="input-field"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function ColorField({ label, value, onChange }) {
  return (
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
        className="w-28 px-2 py-1.5 text-xs font-mono border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
          checked ? 'bg-primary' : 'bg-surface-tertiary'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </button>
      {label && <span className="text-sm text-text-base">{label}</span>}
    </label>
  );
}

// ── Section card ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, preview, children }) {
  const [showPreview, setShowPreview] = useState(true);
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border-soft bg-surface-raised flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted" />
          <h2 className="text-sm font-semibold text-text-base">{title}</h2>
        </div>
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text-base px-2.5 py-1 rounded-base hover:bg-surface-raised transition-colors"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      <div className="p-5 space-y-0">{children}</div>

      {showPreview && (
        <div className="px-5 pb-5">
          <p className="text-xs text-subtle mb-2 font-medium uppercase tracking-wide">Preview</p>
          {preview}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function DraftTemplates() {
  const [homeDraft, setHomeDraft] = useState(DEFAULT.homeDraft);
  const [pageDraft, setPageDraft] = useState(DEFAULT.pageDraft);
  const [original, setOriginal] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/web/draft-templates')
      .then(({ data }) => {
        const h = { ...DEFAULT.homeDraft, ...data.homeDraft };
        const p = { ...DEFAULT.pageDraft, ...data.pageDraft };
        setHomeDraft(h);
        setPageDraft(p);
        setOriginal({ homeDraft: h, pageDraft: p });
      })
      .catch(() => {
        setOriginal({ homeDraft: DEFAULT.homeDraft, pageDraft: DEFAULT.pageDraft });
      })
      .finally(() => setLoading(false));
  }, []);

  const setH = (key, val) => setHomeDraft(t => ({ ...t, [key]: val }));
  const setP = (key, val) => setPageDraft(t => ({ ...t, [key]: val }));

  const isDirty =
    JSON.stringify({ homeDraft, pageDraft }) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await api.put('/web/draft-templates', { homeDraft, pageDraft });
      setOriginal({ homeDraft, pageDraft });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    if (!original) return;
    setHomeDraft(original.homeDraft);
    setPageDraft(original.pageDraft);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-surface-tertiary rounded w-48" />
        <div className="h-64 bg-surface-raised rounded-card" />
        <div className="h-64 bg-surface-raised rounded-card" />
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
            {saveStatus === 'saved' && <Check className="w-4 h-4" />}
            {(saveStatus === 'idle' || saveStatus === 'error') && <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
      </PageHeader>

      <div className="space-y-6">
        {/* ── Home page draft ────────────────────────────────────────── */}
        <SectionCard
          title="Home Page — Maintenance Mode"
          icon={Home}
          preview={<HomeDraftPreview t={homeDraft} />}
        >
          <Field label="Browser title" hint="Shown in the browser tab">
            <TextInput value={homeDraft.title} onChange={v => setH('title', v)} placeholder="Website Under Maintenance" />
          </Field>
          <Field label="Heading">
            <TextInput value={homeDraft.heading} onChange={v => setH('heading', v)} placeholder="We'll be back soon" />
          </Field>
          <Field label="Message">
            <TextInput value={homeDraft.message} onChange={v => setH('message', v)} multiline placeholder="Maintenance message…" />
          </Field>
          <Field label="Background color">
            <ColorField value={homeDraft.bgColor} onChange={v => setH('bgColor', v)} />
          </Field>
          <Field label="Text color">
            <ColorField value={homeDraft.textColor} onChange={v => setH('textColor', v)} />
          </Field>
          <Field label="Accent color" hint="Used for the logo badge, divider, and links">
            <ColorField value={homeDraft.accentColor} onChange={v => setH('accentColor', v)} />
          </Field>
          <Field label="Show logo badge">
            <Toggle checked={homeDraft.showLogo} onChange={v => setH('showLogo', v)} />
          </Field>
          {homeDraft.showLogo && (
            <Field label="Logo text" hint="First letter shown in badge. Leave blank to use site initial.">
              <TextInput value={homeDraft.logoText} onChange={v => setH('logoText', v)} placeholder="S" />
            </Field>
          )}
          <Field label="Show contact email">
            <Toggle checked={homeDraft.showContactEmail} onChange={v => setH('showContactEmail', v)} />
          </Field>
          {homeDraft.showContactEmail && (
            <Field label="Contact email">
              <TextInput value={homeDraft.contactEmail} onChange={v => setH('contactEmail', v)} placeholder="hello@example.com" />
            </Field>
          )}
        </SectionCard>

        {/* ── Regular page draft ─────────────────────────────────────── */}
        <SectionCard
          title="Regular Page — Draft / Not Found"
          icon={FileX}
          preview={<PageDraftPreview t={pageDraft} />}
        >
          <Field label="Browser title">
            <TextInput value={pageDraft.title} onChange={v => setP('title', v)} placeholder="Page Not Found" />
          </Field>
          <Field label="Heading">
            <TextInput value={pageDraft.heading} onChange={v => setP('heading', v)} placeholder="Page Not Found" />
          </Field>
          <Field label="Message">
            <TextInput value={pageDraft.message} onChange={v => setP('message', v)} multiline placeholder="Message to visitors…" />
          </Field>
          <Field label="Background color">
            <ColorField value={pageDraft.bgColor} onChange={v => setP('bgColor', v)} />
          </Field>
          <Field label="Text color">
            <ColorField value={pageDraft.textColor} onChange={v => setP('textColor', v)} />
          </Field>
          <Field label="Accent color" hint="Used for the icon and back link">
            <ColorField value={pageDraft.accentColor} onChange={v => setP('accentColor', v)} />
          </Field>
          <Field label="Show back link">
            <Toggle checked={pageDraft.showBackLink} onChange={v => setP('showBackLink', v)} />
          </Field>
          {pageDraft.showBackLink && (
            <>
              <Field label="Back link label">
                <TextInput value={pageDraft.backLinkLabel} onChange={v => setP('backLinkLabel', v)} placeholder="Go back home" />
              </Field>
              <Field label="Back link URL">
                <TextInput value={pageDraft.backLinkHref} onChange={v => setP('backLinkHref', v)} placeholder="/" />
              </Field>
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
