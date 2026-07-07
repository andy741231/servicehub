import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Tag, Settings, Trash2, GitBranch, Plus, Palette, CheckSquare, SlidersHorizontal, LayoutTemplate, Columns, Grid3x3, LayoutGrid, X, CalendarClock, Calculator, Repeat, ChevronDown } from 'lucide-react';
import useFormStore from '../store/formStore';
import { CONDITION_OPERATORS, DEFAULT_CONDITIONAL_LOGIC, hasConditionalLogic } from '../utils/conditionalLogic';
import { DEFAULT_THEME } from '../store/formStore';
import AccessSchedulePanel from './AccessSchedulePanel';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadFile } from '../api/formsApi';
import { getFormulaPreview } from '../utils/formula';
import ColorPicker from '../../../components/ColorPicker';
import { useToast } from '../../../components/Toast';

const TABS = [
  { id: 'general', label: 'General', icon: Tag },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  { id: 'logic', label: 'Logic', icon: GitBranch },
];

const SECTION_TABS = [
  { id: 'general', label: 'General', icon: Tag },
  { id: 'logic', label: 'Logic', icon: GitBranch },
];

// One-click theme presets. Each merges a full palette into the form theme.
const THEME_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    theme: { primaryColor: '#2563eb', buttonColor: '#2563eb', backgroundColor: '#f9fafb', textColor: '#111827', buttonTextColor: '#ffffff' },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    theme: { primaryColor: '#6366f1', buttonColor: '#6366f1', backgroundColor: '#0f172a', textColor: '#e2e8f0', buttonTextColor: '#ffffff' },
  },
  {
    id: 'forest',
    name: 'Forest',
    theme: { primaryColor: '#059669', buttonColor: '#059669', backgroundColor: '#f0fdf4', textColor: '#064e3b', buttonTextColor: '#ffffff' },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    theme: { primaryColor: '#e11d48', buttonColor: '#e11d48', backgroundColor: '#fff1f2', textColor: '#4c0519', buttonTextColor: '#ffffff' },
  },
  {
    id: 'slate',
    name: 'Slate',
    theme: { primaryColor: '#0f172a', buttonColor: '#0f172a', backgroundColor: '#f8fafc', textColor: '#0f172a', buttonTextColor: '#ffffff' },
  },
  {
    id: 'violet',
    name: 'Violet',
    theme: { primaryColor: '#7c3aed', buttonColor: '#7c3aed', backgroundColor: '#faf5ff', textColor: '#2e1065', buttonTextColor: '#ffffff' },
  },
];

const LAYOUT_OPTIONS = [
  { value: '1', icon: LayoutTemplate, label: '1 column' },
  { value: '2', icon: Columns, label: '2 columns' },
  { value: '3', icon: Grid3x3, label: '3 columns' },
  { value: '4', icon: LayoutGrid, label: '4 columns' },
];

// ─── Accordion section wrapper ─────────────────────────────────────────────
// Collapsible section with a chevron header. Reduces visual overwhelm by
// hiding infrequently-used settings behind expandable headers.
// `defaultOpen` controls the initial expanded state.
function AccordionSection({ id, title, icon: Icon, defaultOpen = false, children, badge, registerRef }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} ref={(el) => registerRef?.(id, el)} className="scroll-mt-20 border-b border-border/60 pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-1 text-body font-medium text-base hover:bg-surface-raised/50 rounded-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={open}
        aria-controls={`${id}-content`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />}
        <span className="flex-1 text-left">{title}</span>
        {badge && <span className="text-xs text-muted bg-surface-raised px-1.5 py-0.5 rounded-full flex-shrink-0">{badge}</span>}
        <ChevronDown className={`h-4 w-4 text-subtle flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-content`} className="pb-3 pt-1 space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Sticky sub-navigation ──────────────────────────────────────────────────
// Pill-style anchor links shown below the tab bar. Clicking scrolls to the
// target section; IntersectionObserver highlights the current section.
function SubNav({ items, scrollContainerRef, sectionRefs, observeKey }) {
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const observerRef = useRef(null);

  useEffect(() => {
    const root = scrollContainerRef?.current;
    if (!root) return;
    if (observerRef.current) observerRef.current.disconnect();
    // Defer slightly so AccordionSection ref callbacks have registered
    const setupObserver = () => {
      const ids = items.map((i) => i.id).filter((id) => sectionRefs?.current?.[id]);
      if (!ids.length) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) {
            setActiveId(visible[0].target.id);
          }
        },
        { root, rootMargin: '-20px 0px -70% 0px', threshold: 0 }
      );
      ids.forEach((id) => {
        const el = sectionRefs.current[id];
        if (el) observerRef.current.observe(el);
      });
    };
    const timer = setTimeout(setupObserver, 50);
    return () => { clearTimeout(timer); observerRef.current?.disconnect(); };
  }, [items, scrollContainerRef, sectionRefs, observeKey]);

  const handleClick = (id) => {
    const el = sectionRefs?.current?.[id];
    if (el && scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  if (items.length <= 1) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-border overflow-x-auto" role="navigation" aria-label="Section navigation">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            activeId === item.id
              ? 'bg-primary-light text-primary'
              : 'text-muted hover:text-base hover:bg-surface-raised'
          }`}
          aria-current={activeId === item.id ? 'true' : undefined}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ─── Content Block Properties Panel ──────────────────────────────────────────
// Shown when a content-type field is selected. Provides style controls
// (text alignment, font size, text color, padding) and conditional logic.

const CONTENT_BLOCK_TABS = [
  { id: 'style',  label: 'Style',  icon: Palette },
  { id: 'logic',  label: 'Logic',  icon: GitBranch },
];

const ALIGN_OPTIONS = [
  { value: 'left',   label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right',  label: 'Right' },
];

function ContentBlockPropertiesPanel({ field, updateField }) {
  const { fields } = useFormStore();
  const [activeTab, setActiveTab] = useState('style');
  const style = field.blockStyle || {};
  const otherFields = fields.filter((f) => f.id !== field.id && f.type !== 'content');

  const handleStyle = (updates) =>
    updateField(field.id, { blockStyle: { ...style, ...updates } });

  const handleLogic = (updates) =>
    updateField(field.id, { conditionalLogic: { ...(field.conditionalLogic || {}), ...updates } });

  return (
    <div className="flex-1 flex flex-col overflow-hidden" aria-label="Content block properties">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-surface" role="tablist">
        {CONTENT_BLOCK_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary flex-1 justify-center ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-base hover:border-border'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            {id === 'logic' && field.conditionalLogic?.conditions?.length > 0 && (
              <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* ── STYLE TAB ── */}
        {activeTab === 'style' && (
          <>
            {/* Text alignment */}
            <section>
              <h3 className="text-small font-medium text-base mb-2">Text Alignment</h3>
              <div className="flex gap-2">
                {ALIGN_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStyle({ textAlign: value })}
                    className={`flex-1 py-1.5 rounded-base text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      (style.textAlign || 'left') === value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border text-muted hover:border-primary hover:text-primary'
                    }`}
                    aria-pressed={(style.textAlign || 'left') === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Font size */}
            <section>
              <label className="block text-small font-medium text-base mb-2">
                Font Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={72}
                  value={style.fontSize || ''}
                  onChange={(e) => handleStyle({ fontSize: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  placeholder="Default"
                  className="w-24 px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                />
                <span className="text-small text-muted">px</span>
              </div>
            </section>

            {/* Text color */}
            <section>
              <label className="block text-small font-medium text-base mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={style.color || '#000000'}
                  onChange={(v) => handleStyle({ color: v })}
                  label="Text Color"
                  allowAlpha={false}
                />
                <span className="text-small text-muted">{style.color || 'Default'}</span>
                {style.color && (
                  <button
                    onClick={() => handleStyle({ color: undefined })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-danger rounded border border-border hover:border-danger/30 transition-colors"
                  >
                    <X className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
            </section>

            {/* Padding */}
            <section>
              <h3 className="text-small font-medium text-base mb-2">Padding</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'paddingTop',    label: 'Top' },
                  { key: 'paddingBottom', label: 'Bottom' },
                  { key: 'paddingLeft',   label: 'Left' },
                  { key: 'paddingRight',  label: 'Right' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted mb-1">{label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={style[key] ?? ''}
                        onChange={(e) => handleStyle({ [key]: e.target.value !== '' ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      />
                      <span className="text-xs text-subtle">px</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── LOGIC TAB ── */}
        {activeTab === 'logic' && (
          <section>
            <h3 className="text-small font-medium text-base mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Conditional Visibility
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cb-logic-enabled"
                  checked={!!field.conditionalLogic?.conditions?.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleLogic({ conditions: [{ fieldId: '', operator: 'equals', value: '' }], operator: 'and' });
                    } else {
                      updateField(field.id, { conditionalLogic: null });
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="cb-logic-enabled" className="text-body text-base cursor-pointer">
                  Show this block conditionally
                </label>
              </div>

              {field.conditionalLogic?.conditions?.length > 0 && (
                <div className="space-y-3 pl-7">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-small text-muted">Show when</span>
                    <select
                      value={field.conditionalLogic?.operator || 'and'}
                      onChange={(e) => handleLogic({ operator: e.target.value })}
                      className="px-2 py-1 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="and">ALL</option>
                      <option value="or">ANY</option>
                    </select>
                    <span className="text-small text-muted">conditions match</span>
                  </div>

                  {(field.conditionalLogic?.conditions || []).map((condition, index) => (
                    <div key={index} className="space-y-2 p-3 bg-surface rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-8">
                          {index === 0 ? 'IF' : field.conditionalLogic.operator === 'or' ? 'OR' : 'AND'}
                        </span>
                        <button
                          onClick={() => {
                            const newConds = field.conditionalLogic.conditions.filter((_, i) => i !== index);
                            handleLogic({ conditions: newConds });
                          }}
                          className="ml-auto p-1 text-subtle hover:text-danger rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <select
                        value={condition.fieldId || ''}
                        onChange={(e) => {
                          const newConds = [...field.conditionalLogic.conditions];
                          newConds[index] = { ...condition, fieldId: e.target.value };
                          handleLogic({ conditions: newConds });
                        }}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      >
                        <option value="">Select a field…</option>
                        {otherFields.map((f) => (
                          <option key={f.id} value={f.id}>{f.label || f.type}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={condition.operator || 'equals'}
                          onChange={(e) => {
                            const newConds = [...field.conditionalLogic.conditions];
                            newConds[index] = { ...condition, operator: e.target.value };
                            handleLogic({ conditions: newConds });
                          }}
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={condition.value || ''}
                          onChange={(e) => {
                            const newConds = [...field.conditionalLogic.conditions];
                            newConds[index] = { ...condition, value: e.target.value };
                            handleLogic({ conditions: newConds });
                          }}
                          placeholder="Value"
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleLogic({
                      conditions: [...(field.conditionalLogic?.conditions || []), { fieldId: '', operator: 'equals', value: '' }],
                    })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Condition
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ImageBlockPropertiesPanel({ field, updateField }) {
  const { fields } = useFormStore();
  const { toast, ToastMount } = useToast();
  const [activeTab, setActiveTab] = useState('style');
  const [isUploading, setIsUploading] = useState(false);
  const style = field.blockStyle || {};
  const otherFields = fields.filter((f) => f.id !== field.id && f.type !== 'image');

  const handleStyle = (updates) =>
    updateField(field.id, { blockStyle: { ...style, ...updates } });

  const handleLogic = (updates) =>
    updateField(field.id, { conditionalLogic: { ...(field.conditionalLogic || {}), ...updates } });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('File is too large. Maximum size is 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      updateField(field.id, { imageUrl: result.url });
    } catch (err) {
      console.error('File upload failed:', err);
      toast('Failed to upload file. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" aria-label="Image block properties">
      <div className="flex border-b border-border bg-surface" role="tablist">
        {CONTENT_BLOCK_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary flex-1 justify-center ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-base hover:border-border'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
            {id === 'logic' && field.conditionalLogic?.conditions?.length > 0 && (
              <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'style' && (
          <>
            <section>
              <h3 className="text-small font-medium text-base mb-2">Image Source</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={field.imageUrl || ''}
                    onChange={(e) => updateField(field.id, { imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted font-medium uppercase tracking-wider">or</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div>
                  <input
                    type="file"
                    id={`upload-${field.id}`}
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <label
                    htmlFor={`upload-${field.id}`}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-surface-raised focus-within:ring-2 focus-within:ring-primary ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-small font-medium text-base mb-2">Image Alignment</h3>
              <div className="flex gap-2">
                {ALIGN_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStyle({ textAlign: value })}
                    className={`flex-1 py-1.5 rounded-base text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      (style.textAlign || 'center') === value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border text-muted hover:border-primary hover:text-primary'
                    }`}
                    aria-pressed={(style.textAlign || 'center') === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
            
            <section>
              <label className="block text-small font-medium text-base mb-2">
                Max Width
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  value={style.width || ''}
                  onChange={(e) => handleStyle({ width: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  placeholder="100%"
                  className="w-24 px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                />
                <span className="text-small text-muted">px</span>
              </div>
            </section>

            <section>
              <h3 className="text-small font-medium text-base mb-2">Padding</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'paddingTop',    label: 'Top' },
                  { key: 'paddingBottom', label: 'Bottom' },
                  { key: 'paddingLeft',   label: 'Left' },
                  { key: 'paddingRight',  label: 'Right' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted mb-1">{label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={style[key] ?? ''}
                        onChange={(e) => handleStyle({ [key]: e.target.value !== '' ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      />
                      <span className="text-xs text-subtle">px</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'logic' && (
          <section>
            <h3 className="text-small font-medium text-base mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Conditional Visibility
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`cb-logic-enabled-${field.id}`}
                  checked={!!field.conditionalLogic?.conditions?.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleLogic({ conditions: [{ fieldId: '', operator: 'equals', value: '' }], operator: 'and' });
                    } else {
                      updateField(field.id, { conditionalLogic: null });
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor={`cb-logic-enabled-${field.id}`} className="text-body text-base cursor-pointer">
                  Show this block conditionally
                </label>
              </div>

              {field.conditionalLogic?.conditions?.length > 0 && (
                <div className="space-y-3 pl-7">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-small text-muted">Show when</span>
                    <select
                      value={field.conditionalLogic?.operator || 'and'}
                      onChange={(e) => handleLogic({ operator: e.target.value })}
                      className="px-2 py-1 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="and">ALL</option>
                      <option value="or">ANY</option>
                    </select>
                    <span className="text-small text-muted">conditions match</span>
                  </div>

                  {(field.conditionalLogic?.conditions || []).map((condition, index) => (
                    <div key={index} className="space-y-2 p-3 bg-surface rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-8">
                          {index === 0 ? 'IF' : field.conditionalLogic.operator === 'or' ? 'OR' : 'AND'}
                        </span>
                        <button
                          onClick={() => {
                            const newConds = field.conditionalLogic.conditions.filter((_, i) => i !== index);
                            handleLogic({ conditions: newConds });
                          }}
                          className="ml-auto p-1 text-subtle hover:text-danger rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <select
                        value={condition.fieldId || ''}
                        onChange={(e) => {
                          const newConds = [...field.conditionalLogic.conditions];
                          newConds[index] = { ...condition, fieldId: e.target.value };
                          handleLogic({ conditions: newConds });
                        }}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      >
                        <option value="">Select a field…</option>
                        {otherFields.map((f) => (
                          <option key={f.id} value={f.id}>{f.label || f.type}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={condition.operator || 'equals'}
                          onChange={(e) => {
                            const newConds = [...field.conditionalLogic.conditions];
                            newConds[index] = { ...condition, operator: e.target.value };
                            handleLogic({ conditions: newConds });
                          }}
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={condition.value || ''}
                          onChange={(e) => {
                            const newConds = [...field.conditionalLogic.conditions];
                            newConds[index] = { ...condition, value: e.target.value };
                            handleLogic({ conditions: newConds });
                          }}
                          placeholder="Value"
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleLogic({
                      conditions: [...(field.conditionalLogic?.conditions || []), { fieldId: '', operator: 'equals', value: '' }],
                    })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Condition
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Computed Field Settings ─────────────────────────────────────────────────
// Lets the admin define a formula that auto-calculates from other fields.
// References use ${Field Label} or ${fieldId} syntax.
function ComputedFieldSettings({ field, handleUpdate, fields }) {
  const otherFields = fields.filter((f) => f.id !== field.id && f.type !== 'content' && f.type !== 'image' && f.type !== 'pageBreak');

  return (
    <section>
      <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4" aria-hidden="true" />
        Formula
      </h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="prop-formula" className="block text-small font-medium text-base mb-1.5">
            Calculation formula
          </label>
          <input
            id="prop-formula"
            type="text"
            value={field.formula || ''}
            onChange={(e) => handleUpdate({ formula: e.target.value })}
            placeholder="${Price} * ${Quantity}"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted font-mono text-small min-h-[44px]"
          />
          <p className="text-xs text-muted mt-1.5">
            Reference other fields by label: <code className="px-1 bg-surface-raised rounded">{'${Field Label}'}</code>.
            Supports +, -, *, / and parentheses.
          </p>
        </div>

        {/* Quick reference list */}
        {otherFields.length > 0 && (
          <div>
            <label className="block text-small font-medium text-base mb-1.5">Available fields</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {otherFields.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    const ref = f.label ? `\${${f.label}}` : `\${${f.id}}`;
                    handleUpdate({ formula: (field.formula || '') + ref });
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  title={`Insert ${f.label || f.id} reference`}
                >
                  <span className="text-xs font-mono text-primary flex-shrink-0">{'${...}'}</span>
                  <span className="text-small text-base truncate">{f.label || f.id}</span>
                  <span className="text-xs text-muted ml-auto">{f.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="prop-display-format" className="block text-small font-medium text-base mb-1.5">
            Display format
          </label>
          <input
            id="prop-display-format"
            type="text"
            value={field.displayFormat || ''}
            onChange={(e) => handleUpdate({ displayFormat: e.target.value })}
            placeholder="{value}"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          />
          <p className="text-xs text-muted mt-1.5">
            Use <code className="px-1 bg-surface-raised rounded">{'{value}'}</code> as a placeholder.
            Example: <code className="px-1 bg-surface-raised rounded">${'$'}{'{value} USD'}</code>
          </p>
        </div>

        {/* Live preview */}
        {field.formula && (
          <div className="p-3 bg-primary-light/40 border border-primary/20 rounded-base">
            <div className="text-xs text-muted mb-1">Preview (with zeros):</div>
            <div className="text-body font-semibold text-primary">
              {getFormulaPreview(field.formula, field.displayFormat)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Repeating Group Settings ────────────────────────────────────────────────
// Configures how many times a group can be repeated by the form filler.
function RepeatingGroupSettings({ field, handleUpdate }) {
  return (
    <section>
      <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
        <Repeat className="h-4 w-4" aria-hidden="true" />
        Repeating Group
      </h3>
      <div className="space-y-4">
        <p className="text-small text-muted">
          A repeating group lets users submit the same set of fields multiple times
          (e.g., listing multiple items or attendees).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="prop-min-instances" className="block text-small font-medium text-base mb-1.5">
              Minimum entries
            </label>
            <input
              id="prop-min-instances"
              type="number"
              min={0}
              value={field.minInstances ?? 1}
              onChange={(e) => handleUpdate({ minInstances: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="prop-max-instances" className="block text-small font-medium text-base mb-1.5">
              Max entries (blank = ∞)
            </label>
            <input
              id="prop-max-instances"
              type="number"
              min={1}
              value={field.maxInstances ?? ''}
              onChange={(e) => handleUpdate({ maxInstances: e.target.value ? parseInt(e.target.value) : '' })}
              placeholder="No limit"
              className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body placeholder:text-muted min-h-[44px]"
            />
          </div>
        </div>
        <div>
          <label htmlFor="prop-add-button-label" className="block text-small font-medium text-base mb-1.5">
            "Add another" button label
          </label>
          <input
            id="prop-add-button-label"
            type="text"
            value={field.addButtonLabel || ''}
            onChange={(e) => handleUpdate({ addButtonLabel: e.target.value })}
            placeholder="Add another"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body placeholder:text-muted min-h-[44px]"
          />
        </div>
      </div>
    </section>
  );
}

function SectionPropertiesPanel({ selectedSection }) {
  const { rows, fields, updateRow } = useFormStore();
  const row = rows.find((r) => r.id === selectedSection);
  const [activeTab, setActiveTab] = useState('general');
  useEffect(() => { setActiveTab('general'); }, [selectedSection]);

  if (!row) return null;

  const sectionBg = row.backgroundColor || '';
  const otherFields = fields.filter((f) => f.rowId !== selectedSection);

  const handleUpdate = (updates) => updateRow(row.id, updates);

  const tabBar = (
    <div className="flex border-b border-border bg-surface" role="tablist">
      {SECTION_TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary flex-1 justify-center ${
            activeTab === id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-base hover:border-border'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
          {id === 'logic' && row.conditionalLogic?.conditions?.length > 0 && (
            <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {tabBar}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <>
            <section className="space-y-4">
              <div>
                <label className="block text-small font-medium text-base mb-1.5">Section Label</label>
                <input
                  type="text"
                  value={row.label || ''}
                  onChange={(e) => handleUpdate({ label: e.target.value })}
                  placeholder="Section label"
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-small font-medium text-base mb-1.5">Description</label>
                <textarea
                  value={row.description || ''}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  placeholder="Optional description shown above fields"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted resize-none"
                />
              </div>
            </section>

            <section>
              <h3 className="text-small font-medium text-base mb-3">Column Layout</h3>
              <div className="flex gap-2">
                {LAYOUT_OPTIONS.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => handleUpdate({ columns: value })}
                    className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      (row.columns || '1') === value
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                    }`}
                    title={label}
                    aria-label={label}
                    aria-pressed={(row.columns || '1') === value}
                  >
                    <Icon className="h-4 w-4" />
                    {value}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-small font-medium text-base mb-3">Background Color</h3>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={sectionBg || '#ffffff'}
                  onChange={(v) => handleUpdate({ backgroundColor: v })}
                  label="Section Background Color"
                  allowAlpha={false}
                />
                <span className="text-small text-muted">{sectionBg || 'None'}</span>
                {sectionBg && (
                  <button
                    onClick={() => handleUpdate({ backgroundColor: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-danger rounded border border-border hover:border-danger/30 transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {/* LOGIC TAB */}
        {activeTab === 'logic' && (
          <section>
            <h3 className="text-small font-medium text-base mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" /> Conditional Logic
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="section-logic-enabled"
                  checked={!!row.conditionalLogic?.conditions?.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleUpdate({ conditionalLogic: { ...DEFAULT_CONDITIONAL_LOGIC } });
                    } else {
                      handleUpdate({ conditionalLogic: null });
                    }
                  }}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="section-logic-enabled" className="text-body text-base cursor-pointer">
                  Enable conditional logic
                </label>
              </div>

              {row.conditionalLogic?.conditions != null && (
                <div className="space-y-3 pl-7">
                  {/* Action */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-small text-muted">Show this section when</span>
                    <select
                      value={row.conditionalLogic?.operator || 'and'}
                      onChange={(e) => handleUpdate({ conditionalLogic: { ...row.conditionalLogic, operator: e.target.value } })}
                      className="px-2 py-1 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="and">ALL</option>
                      <option value="or">ANY</option>
                    </select>
                    <span className="text-small text-muted">conditions match</span>
                  </div>

                  {/* Conditions */}
                  {(row.conditionalLogic?.conditions || []).map((condition, index) => {
                    const operator = CONDITION_OPERATORS.find((op) => op.value === condition.operator);
                    return (
                      <div key={index} className="space-y-2 p-3 bg-surface rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted w-8">{index === 0 ? 'IF' : row.conditionalLogic.operator === 'or' ? 'OR' : 'AND'}</span>
                          <button
                            onClick={() => {
                              const newConds = row.conditionalLogic.conditions.filter((_, i) => i !== index);
                              handleUpdate({ conditionalLogic: { ...row.conditionalLogic, conditions: newConds } });
                            }}
                            className="ml-auto p-1 text-subtle hover:text-danger rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <select
                          value={condition.fieldId || ''}
                          onChange={(e) => {
                            const newConds = [...row.conditionalLogic.conditions];
                            newConds[index] = { ...condition, fieldId: e.target.value };
                            handleUpdate({ conditionalLogic: { ...row.conditionalLogic, conditions: newConds } });
                          }}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        >
                          <option value="">Select a field…</option>
                          {otherFields.map((f) => (
                            <option key={f.id} value={f.id}>{f.label || f.type}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <select
                            value={condition.operator || 'equals'}
                            onChange={(e) => {
                              const newConds = [...row.conditionalLogic.conditions];
                              newConds[index] = { ...condition, operator: e.target.value };
                              handleUpdate({ conditionalLogic: { ...row.conditionalLogic, conditions: newConds } });
                            }}
                            className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                          >
                            {CONDITION_OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                          {operator?.supportsValue && (
                            <input
                              type="text"
                              value={condition.value || ''}
                              onChange={(e) => {
                                const newConds = [...row.conditionalLogic.conditions];
                                newConds[index] = { ...condition, value: e.target.value };
                                handleUpdate({ conditionalLogic: { ...row.conditionalLogic, conditions: newConds } });
                              }}
                              placeholder="Value"
                              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => handleUpdate({
                      conditionalLogic: {
                        ...row.conditionalLogic,
                        conditions: [...(row.conditionalLogic?.conditions || []), { fieldId: '', operator: 'equals', value: '' }],
                      },
                    })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Condition
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

      </div>
      {ToastMount}
    </div>
  );
}

const FORM_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'settings', label: 'Settings', icon: CheckSquare },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
];

export default function PropertiesPanel({ selectedField, selectedSection, onUpdateField }) {
  const { fields, updateField, currentFormId, forms, updateFormTheme } = useFormStore();
  const field = fields.find((f) => f.id === selectedField);
  const currentForm = forms.find((f) => f.id === currentFormId);
  const theme = currentForm?.theme || { ...DEFAULT_THEME };
  const [activeTab, setActiveTab] = useState('general');
  const [formTab, setFormTab] = useState('appearance');
  // Reset to General tab when the selected field changes
  useEffect(() => { setActiveTab('general'); }, [selectedField]);

  // ─── Hooks for field-level SubNav + AccordionSection (must run before any early return) ───
  const scrollContainerRef = useRef(null);
  const sectionRefs = useRef({});
  const [observedFieldKey, setObservedFieldKey] = useState('');
  const registerSection = useCallback((id, el) => {
    if (el) sectionRefs.current[id] = el;
    else delete sectionRefs.current[id];
  }, []);

  // Clear stale section refs + bump re-observe trigger when field or tab changes
  useEffect(() => {
    sectionRefs.current = {};
    setObservedFieldKey(`${field?.id || 'none'}-${activeTab}`);
  }, [selectedField, activeTab, field?.id]);

  // Build the sub-nav items for the active tab (only sections that exist for this field type)
  const generalNavItems = useMemo(() => {
    const items = [{ id: 'sec-basics', label: 'Basics' }];
    if (field?.type === 'select' || field?.type === 'checkbox') items.push({ id: 'sec-options', label: 'Options' });
    if (field?.type === 'computed') items.push({ id: 'sec-computed', label: 'Formula' });
    if (field?.type === 'repeatingGroup') items.push({ id: 'sec-repeating', label: 'Group' });
    return items;
  }, [field?.type]);

  const advancedNavItems = useMemo(() => {
    const items = [];
    const ft = field?.type;
    if (ft === 'file') items.push({ id: 'sec-file', label: 'File' });
    if (['text', 'textarea', 'url'].includes(ft)) items.push({ id: 'sec-validation', label: 'Validation' });
    if (ft === 'number') items.push({ id: 'sec-validation', label: 'Range' });
    if (ft === 'slider') items.push({ id: 'sec-validation', label: 'Range' });
    if (ft === 'rating') items.push({ id: 'sec-validation', label: 'Stars' });
    if (['text', 'textarea', 'number', 'file', 'url', 'slider', 'rating', 'computed', 'repeatingGroup'].includes(ft)) items.push({ id: 'sec-error-msg', label: 'Error Message' });
    return items;
  }, [field?.type]);

  // Show section properties if a section is selected
  if (selectedSection) {
    return <SectionPropertiesPanel selectedSection={selectedSection} />;
  }

  if (!field) {
    const s = currentForm?.accessSchedule;
    const hasSchedule = s?.enabled && (s?.dateRange?.enabled || s?.weeklyHours?.enabled);
    return (
      <div className="flex-1 flex flex-col overflow-hidden" role="tabpanel" aria-label="Form settings">
        {/* Form-level tab bar */}
        <div className="flex border-b border-border bg-surface" role="tablist" aria-label="Form property tabs">
          {FORM_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={formTab === id}
              onClick={() => setFormTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary flex-1 justify-center ${
                formTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-base hover:border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {id === 'schedule' && hasSchedule && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-label="Schedule active" />
              )}
            </button>
          ))}
        </div>

        {/* Schedule tab */}
        {formTab === 'schedule' && <AccessSchedulePanel />}

        {/* Appearance + Settings tabs */}
        {formTab === 'appearance' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme presets */}
        <section>
          <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" aria-hidden="true" />
            Theme Presets
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateFormTheme(preset.theme)}
                className="group p-2 border border-border rounded-base hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-left"
                aria-label={`Apply ${preset.name} theme`}
              >
                <div className="flex items-center gap-1 mb-1.5 h-6 rounded overflow-hidden">
                  <span className="flex-1" style={{ backgroundColor: preset.theme.primaryColor }} />
                  <span className="flex-1" style={{ backgroundColor: preset.theme.buttonColor }} />
                  <span className="flex-[2]" style={{ backgroundColor: preset.theme.backgroundColor }} />
                </div>
                <span className="text-small font-medium text-base">{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" aria-hidden="true" />
            Theme & Appearance
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="theme-primary" className="block text-small font-medium text-base mb-1.5">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={theme.primaryColor}
                  onChange={(v) => updateFormTheme({ primaryColor: v })}
                  label="Primary Color"
                  allowAlpha={false}
                />
                <span className="text-body text-muted">{theme.primaryColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-button" className="block text-small font-medium text-base mb-1.5">
                Button Color
              </label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={theme.buttonColor}
                  onChange={(v) => updateFormTheme({ buttonColor: v })}
                  label="Button Color"
                  allowAlpha={false}
                />
                <span className="text-body text-muted">{theme.buttonColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-background" className="block text-small font-medium text-base mb-1.5">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={theme.backgroundColor}
                  onChange={(v) => updateFormTheme({ backgroundColor: v })}
                  label="Background Color"
                  allowAlpha={false}
                />
                <span className="text-body text-muted">{theme.backgroundColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-text" className="block text-small font-medium text-base mb-1.5">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  value={theme.textColor}
                  onChange={(v) => updateFormTheme({ textColor: v })}
                  label="Text Color"
                  allowAlpha={false}
                />
                <span className="text-body text-muted">{theme.textColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-font" className="block text-small font-medium text-base mb-1.5">
                Font Family
              </label>
              <select
                id="theme-font"
                value={theme.fontFamily}
                onChange={(e) => updateFormTheme({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
              >
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
                <option value="system-ui">System UI</option>
              </select>
            </div>
          </div>
        </section>
        </div>
        )}

        {formTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
            Form Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="theme-button-text" className="block text-small font-medium text-base mb-1.5">
                Submit Button Text
              </label>
              <input
                id="theme-button-text"
                type="text"
                value={theme.buttonText}
                onChange={(e) => updateFormTheme({ buttonText: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="theme-thank-you-title" className="block text-small font-medium text-base mb-1.5">
                Thank You Title
              </label>
              <input
                id="theme-thank-you-title"
                type="text"
                value={theme.thankYouTitle}
                onChange={(e) => updateFormTheme({ thankYouTitle: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="theme-thank-you-message" className="block text-small font-medium text-base mb-1.5">
                Thank You Message
              </label>
              <div className="prose-editor">
                <ReactQuill
                  theme="snow"
                  value={theme.thankYouMessage || ''}
                  onChange={(value) => updateFormTheme({ thankYouMessage: value })}
                  className="bg-background [&_.ql-container]:min-h-[100px] [&_.ql-container]:text-body [&_.ql-container]:font-sans [&_.ql-toolbar]:border-border [&_.ql-container]:border-border [&_.ql-container]:rounded-b-base [&_.ql-toolbar]:rounded-t-base"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      [{ align: [] }],
                      ['link'],
                      ['clean'],
                    ],
                  }}
                  formats={['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'align', 'link']}
                />
              </div>
            </div>
            <div>
              <label htmlFor="theme-redirect-url" className="block text-small font-medium text-base mb-1.5">
                Redirect URL (optional)
              </label>
              <input
                id="theme-redirect-url"
                type="url"
                value={theme.redirectUrl}
                onChange={(e) => updateFormTheme({ redirectUrl: e.target.value })}
                placeholder="https://example.com/thank-you"
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-small font-medium text-base mb-2">
                Progress Indicator
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'none',  label: 'None',  desc: 'Hidden' },
                  { value: 'bar',   label: 'Bar',   desc: '— 60%' },
                  { value: 'steps', label: 'Steps', desc: '① ② ③' },
                ].map(({ value, label, desc }) => {
                  const active = (theme.progressBarStyle || 'none') === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateFormTheme({ progressBarStyle: value })}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                        active
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                      }`}
                      aria-pressed={active}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="opacity-60 text-[10px]">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="theme-question-numbers"
                checked={theme.showQuestionNumbers}
                onChange={(e) => updateFormTheme({ showQuestionNumbers: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <label htmlFor="theme-question-numbers" className="text-body text-base cursor-pointer">
                Show question numbers
              </label>
            </div>
            <div>
              <label className="block text-small font-medium text-base mb-2">
                Form Layout
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'page',           label: 'Classic',   desc: 'All fields per section' },
                  { value: 'conversational', label: 'One-by-one', desc: 'One question per screen' },
                ].map(({ value, label, desc }) => {
                  const active = (theme.layoutMode || 'page') === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateFormTheme({ layoutMode: value })}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                        active
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                      }`}
                      aria-pressed={active}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="opacity-60 text-[10px] text-center">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        </div>
        )}
      </div>
    );
  }

  // ── Short-circuit: content block gets its own dedicated panel ─────────────
  if (field.type === 'content') {
    return <ContentBlockPropertiesPanel field={field} updateField={updateField} />;
  }
  if (field.type === 'image') {
    return <ImageBlockPropertiesPanel field={field} updateField={updateField} />;
  }

  const handleUpdate = (updates) => {
    updateField(field.id, updates);
  };

  // Build the sub-nav items for the active tab (only sections that exist for this field type)
  const activeNavItems = activeTab === 'general' ? generalNavItems : activeTab === 'advanced' ? advancedNavItems : [];

  // Tab bar
  const tabBar = (
    <div className="flex border-b border-border bg-surface" role="tablist" aria-label="Field property tabs">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary flex-1 justify-center ${
            activeTab === id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-base hover:border-border'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
          {id === 'logic' && hasConditionalLogic(field) && (
            <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" aria-label="Logic active" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" aria-label="Field properties">
      {tabBar}
      {activeNavItems.length > 1 && (
        <SubNav items={activeNavItems} scrollContainerRef={scrollContainerRef} sectionRefs={sectionRefs} observeKey={observedFieldKey} />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2" role="tabpanel" ref={scrollContainerRef}>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <>
          <AccordionSection id="sec-basics" title="Basics" icon={Tag} defaultOpen={true} registerRef={registerSection}>
            <div className="space-y-4">
              <div>
                <label htmlFor="prop-label" className="block text-small font-medium text-base mb-1.5">
                  Field Label
                </label>
                <input
                  id="prop-label"
                  type="text"
                  value={field.label || ''}
                  onChange={(e) => handleUpdate({ label: e.target.value })}
                  placeholder="Enter field label"
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                />
              </div>

              {field.type !== 'content' && field.type !== 'pageBreak' && field.type !== 'checkbox' && (
                <div>
                  <label htmlFor="prop-placeholder" className="block text-small font-medium text-base mb-1.5">
                    Placeholder Text
                  </label>
                  <input
                    id="prop-placeholder"
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => handleUpdate({ placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="prop-help" className="block text-small font-medium text-base mb-1.5">
                  Help Text
                </label>
                <textarea
                  id="prop-help"
                  value={field.helpText || ''}
                  onChange={(e) => handleUpdate({ helpText: e.target.value })}
                  placeholder="Add help text for users"
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted resize-none"
                />
              </div>

              {field.type !== 'content' && field.type !== 'pageBreak' && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="prop-required"
                    checked={field.required || false}
                    onChange={(e) => handleUpdate({ required: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  />
                  <label htmlFor="prop-required" className="text-body text-base cursor-pointer">
                    Required field
                  </label>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Options for select/checkbox */}
          {(field.type === 'select' || field.type === 'checkbox') && (
            <AccordionSection id="sec-options" title="Options" icon={Settings} defaultOpen={true} registerRef={registerSection} badge={field.options?.length || 0}>
              <div className="space-y-2" role="list" aria-label="Field options">
                {field.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label htmlFor={`option-${index}`} className="sr-only">Option {index + 1}</label>
                    <input
                      id={`option-${index}`}
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...field.options];
                        newOptions[index] = e.target.value;
                        handleUpdate({ options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                    />
                    <button
                      onClick={() => {
                        const newOptions = field.options.filter((_, i) => i !== index);
                        handleUpdate({ options: newOptions });
                      }}
                      className="p-2 text-subtle hover:text-danger hover:bg-danger-light rounded focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-colors duration-150"
                      title="Remove option"
                      aria-label={`Remove option ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleUpdate({ options: [...(field.options || []), ''] })}
                  className="w-full px-3 py-2 border border-dashed border-border rounded-base text-body text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                  aria-label="Add new option"
                >
                  + Add Option
                </button>
              </div>
            </AccordionSection>
          )}

          {/* ── Computed field settings ── */}
          {field.type === 'computed' && (
            <AccordionSection id="sec-computed" title="Formula" icon={Calculator} defaultOpen={true} registerRef={registerSection}>
              <ComputedFieldSettings field={field} handleUpdate={handleUpdate} fields={fields} />
            </AccordionSection>
          )}

          {/* ── Repeating group settings ── */}
          {field.type === 'repeatingGroup' && (
            <AccordionSection id="sec-repeating" title="Group Settings" icon={Repeat} defaultOpen={true} registerRef={registerSection}>
              <RepeatingGroupSettings field={field} handleUpdate={handleUpdate} />
            </AccordionSection>
          )}
        </>
      )}

      {/* ── ADVANCED TAB ── */}
      {activeTab === 'advanced' && (
        <>
          {/* File-specific settings */}
          {field.type === 'file' && (
            <AccordionSection id="sec-file" title="File Settings" icon={Settings} defaultOpen={true} registerRef={registerSection}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="prop-accept" className="block text-small font-medium text-base mb-1.5">
                    Accepted File Types
                  </label>
                  <input
                    id="prop-accept"
                    type="text"
                    value={field.accept || ''}
                    onChange={(e) => handleUpdate({ accept: e.target.value })}
                    placeholder=".pdf,.doc,.jpg"
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="prop-max-size" className="block text-small font-medium text-base mb-1.5">
                    Max File Size (MB)
                  </label>
                  <input
                    id="prop-max-size"
                    type="number"
                    min={1}
                    value={field.maxSize || ''}
                    onChange={(e) => handleUpdate({ maxSize: parseInt(e.target.value) || undefined })}
                    placeholder="No limit"
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                  />
                </div>
              </div>
            </AccordionSection>
          )}

          {/* Validation */}
          {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'url' || field.type === 'slider' || field.type === 'rating') && (
            <AccordionSection id="sec-validation" title="Validation & Range" icon={SlidersHorizontal} defaultOpen={true} registerRef={registerSection}>
              <div className="space-y-4">
                {(field.type === 'text' || field.type === 'textarea' || field.type === 'url') && (
                  <>
                    <div>
                      <label htmlFor="prop-min-length" className="block text-small font-medium text-base mb-1.5">
                        Min Characters
                      </label>
                      <input
                        id="prop-min-length"
                        type="number"
                        value={field.minLength || ''}
                        onChange={(e) => handleUpdate({ minLength: parseInt(e.target.value) || undefined })}
                        placeholder="No minimum"
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="prop-max-length" className="block text-small font-medium text-base mb-1.5">
                        Max Characters
                      </label>
                      <input
                        id="prop-max-length"
                        type="number"
                        value={field.maxLength || ''}
                        onChange={(e) => handleUpdate({ maxLength: parseInt(e.target.value) || undefined })}
                        placeholder="No maximum"
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="prop-pattern" className="block text-small font-medium text-base mb-1.5">
                        Pattern (regex)
                      </label>
                      <input
                        id="prop-pattern"
                        type="text"
                        value={field.pattern || ''}
                        onChange={(e) => handleUpdate({ pattern: e.target.value || undefined })}
                        placeholder="e.g. ^[A-Z]{2}-\d{4}$"
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted font-mono text-small min-h-[44px]"
                      />
                      <p className="text-xs text-muted mt-1">Value must match this regular expression.</p>
                    </div>
                  </>
                )}
                {field.type === 'number' && (
                  <>
                    <div>
                      <label htmlFor="prop-min-value" className="block text-small font-medium text-base mb-1.5">
                        Minimum Value
                      </label>
                      <input
                        id="prop-min-value"
                        type="number"
                        value={field.minValue || ''}
                        onChange={(e) => handleUpdate({ minValue: parseFloat(e.target.value) || undefined })}
                        placeholder="No minimum"
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="prop-max-value" className="block text-small font-medium text-base mb-1.5">
                        Maximum Value
                      </label>
                      <input
                        id="prop-max-value"
                        type="number"
                        value={field.maxValue || ''}
                        onChange={(e) => handleUpdate({ maxValue: parseFloat(e.target.value) || undefined })}
                        placeholder="No maximum"
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                      />
                    </div>
                  </>
                )}
                {field.type === 'slider' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="prop-slider-min" className="block text-small font-medium text-base mb-1.5">Min</label>
                        <input id="prop-slider-min" type="number" value={field.min ?? 0} onChange={(e) => handleUpdate({ min: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]" />
                      </div>
                      <div>
                        <label htmlFor="prop-slider-max" className="block text-small font-medium text-base mb-1.5">Max</label>
                        <input id="prop-slider-max" type="number" value={field.max ?? 100} onChange={(e) => handleUpdate({ max: parseFloat(e.target.value) || 100 })} className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="prop-slider-step" className="block text-small font-medium text-base mb-1.5">Step</label>
                      <input id="prop-slider-step" type="number" value={field.step ?? 1} onChange={(e) => handleUpdate({ step: parseFloat(e.target.value) || 1 })} className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]" />
                    </div>
                  </>
                )}
                {field.type === 'rating' && (
                  <div>
                    <label htmlFor="prop-max-stars" className="block text-small font-medium text-base mb-1.5">Number of stars</label>
                    <input id="prop-max-stars" type="number" min={1} max={10} value={field.maxStars ?? 5} onChange={(e) => handleUpdate({ maxStars: parseInt(e.target.value) || 5 })} className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]" />
                  </div>
                )}
              </div>
            </AccordionSection>
          )}

          {/* Custom validation error message — separate accordion, collapsed by default */}
          {['text', 'textarea', 'number', 'file', 'url', 'slider', 'rating', 'computed', 'repeatingGroup'].includes(field.type) && (
            <AccordionSection id="sec-error-msg" title="Custom Error Message" icon={Tag} defaultOpen={false} registerRef={registerSection}>
              <div>
                <label htmlFor="prop-validation-msg" className="block text-small font-medium text-base mb-1.5">
                  Custom error message
                </label>
                <input
                  id="prop-validation-msg"
                  type="text"
                  value={field.validationMessage || ''}
                  onChange={(e) => handleUpdate({ validationMessage: e.target.value || undefined })}
                  placeholder="Shown when validation fails"
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                />
              </div>
            </AccordionSection>
          )}

          {/* No advanced settings available */}
          {field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'file' && field.type !== 'url' && field.type !== 'slider' && field.type !== 'rating' && field.type !== 'computed' && field.type !== 'repeatingGroup' && (
            <p className="text-small text-muted text-center py-8">No advanced settings for this field type.</p>
          )}
        </>
      )}

      {/* ── LOGIC TAB ── */}
      {activeTab === 'logic' && (
        <section>
        <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4" aria-hidden="true" />
          Conditional Logic
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="prop-conditional-enabled"
              checked={hasConditionalLogic(field)}
              onChange={(e) => {
                if (e.target.checked) {
                  handleUpdate({
                    conditionalLogic: {
                      ...DEFAULT_CONDITIONAL_LOGIC,
                      conditions: [{ fieldId: '', operator: 'equals', value: '' }],
                    },
                  });
                } else {
                  handleUpdate({ conditionalLogic: undefined });
                }
              }}
              className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
            />
            <label htmlFor="prop-conditional-enabled" className="text-body text-base cursor-pointer">
              Show/hide based on conditions
            </label>
          </div>

          {hasConditionalLogic(field) && (
            <div className="space-y-4 border border-border rounded-base p-4 bg-background">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prop-conditional-action" className="block text-small font-medium text-base mb-1.5">
                    Action
                  </label>
                  <select
                    id="prop-conditional-action"
                    value={field.conditionalLogic?.action || 'show'}
                    onChange={(e) =>
                      handleUpdate({
                        conditionalLogic: {
                          ...field.conditionalLogic,
                          action: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                  >
                    <option value="show">Show</option>
                    <option value="hide">Hide</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prop-conditional-operator" className="block text-small font-medium text-base mb-1.5">
                    Match
                  </label>
                  <select
                    id="prop-conditional-operator"
                    value={field.conditionalLogic?.operator || 'and'}
                    onChange={(e) =>
                      handleUpdate({
                        conditionalLogic: {
                          ...field.conditionalLogic,
                          operator: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                  >
                    <option value="and">All conditions</option>
                    <option value="or">Any condition</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {(field.conditionalLogic?.conditions || []).map((condition, index) => {
                  const operator = CONDITION_OPERATORS.find((op) => op.value === condition.operator);
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-small text-muted w-6">{index + 1}.</span>
                        <select
                          value={condition.fieldId}
                          onChange={(e) => {
                            const newConditions = [...field.conditionalLogic.conditions];
                            newConditions[index] = { ...condition, fieldId: e.target.value };
                            handleUpdate({ conditionalLogic: { ...field.conditionalLogic, conditions: newConditions } });
                          }}
                          className="flex-1 px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                          aria-label={`Condition ${index + 1} field`}
                        >
                          <option value="">Select field</option>
                          {fields
                            .filter((f) => f.id !== field.id && f.type !== 'content')
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label || f.id}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => {
                            const newConditions = field.conditionalLogic.conditions.filter((_, i) => i !== index);
                            handleUpdate({ conditionalLogic: { ...field.conditionalLogic, conditions: newConditions } });
                          }}
                          className="p-2 text-subtle hover:text-danger hover:bg-danger-light rounded focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-colors duration-150"
                          aria-label={`Remove condition ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-8">
                        <select
                          value={condition.operator}
                          onChange={(e) => {
                            const newOperator = e.target.value;
                            const newConditions = [...field.conditionalLogic.conditions];
                            const supportsValue = CONDITION_OPERATORS.find((op) => op.value === newOperator)?.supportsValue ?? true;
                            newConditions[index] = {
                              ...condition,
                              operator: newOperator,
                              value: supportsValue ? condition.value : '',
                            };
                            handleUpdate({ conditionalLogic: { ...field.conditionalLogic, conditions: newConditions } });
                          }}
                          className="px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                          aria-label={`Condition ${index + 1} operator`}
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        {operator?.supportsValue && (
                          <input
                            type="text"
                            value={condition.value || ''}
                            onChange={(e) => {
                              const newConditions = [...field.conditionalLogic.conditions];
                              newConditions[index] = { ...condition, value: e.target.value };
                              handleUpdate({ conditionalLogic: { ...field.conditionalLogic, conditions: newConditions } });
                            }}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
                            aria-label={`Condition ${index + 1} value`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  handleUpdate({
                    conditionalLogic: {
                      ...field.conditionalLogic,
                      conditions: [
                        ...(field.conditionalLogic?.conditions || []),
                        { fieldId: '', operator: 'equals', value: '' },
                      ],
                    },
                  })
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-body text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              >
                <Plus className="h-4 w-4" />
                Add Condition
              </button>
            </div>
          )}
        </div>
      </section>
      )}

      </div>
    </div>
  );
}
