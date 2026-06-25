import { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, RefreshCw, Eye, EyeOff, Home, FileX } from 'lucide-react';
import api from '../../utils/api';

const DEFAULT = {
  homeDraft: {
    title: 'Website Under Maintenance',
    heading: "We'll be back soon",
    message:
      'Our website is currently undergoing scheduled maintenance. We should be back shortly. Thank you for your patience.',
    bgColor: '#1e293b',
    textColor: '#f1f5f9',
    accentColor: '#3b82f6',
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
      className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ backgroundColor: t.bgColor, color: t.textColor, minHeight: 320 }}
    >
      <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-6">
        {t.showLogo && (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
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
      className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm"
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
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, multiline }) {
  const cls =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
  if (multiline)
    return (
      <textarea
        rows={3}
        className={cls}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  return (
    <input
      type="text"
      className={cls}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-28 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ── Section card ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, preview, children }) {
  const [showPreview, setShowPreview] = useState(true);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        </div>
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      <div className="p-5 space-y-0">{children}</div>

      {showPreview && (
        <div className="px-5 pb-5">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
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
      <div className="p-8 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Draft Page Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize what visitors see when a page is in draft mode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saveStatus === 'saving'}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saveStatus === 'saving' && <AlertCircle className="w-4 h-4 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4" />}
            {(saveStatus === 'idle' || saveStatus === 'error') && <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

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
