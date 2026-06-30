import { useState, useEffect } from 'react';
import { Tag, Settings, Trash2, GitBranch, Plus, Palette, CheckSquare, SlidersHorizontal, LayoutTemplate, Columns, Grid3x3, LayoutGrid, X, CalendarClock } from 'lucide-react';
import useFormStore from '../store/formStore';
import { CONDITION_OPERATORS, DEFAULT_CONDITIONAL_LOGIC, hasConditionalLogic } from '../utils/conditionalLogic';
import { DEFAULT_THEME } from '../store/formStore';
import AccessSchedulePanel from './AccessSchedulePanel';

const TABS = [
  { id: 'general', label: 'General', icon: Tag },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
  { id: 'logic', label: 'Logic', icon: GitBranch },
];

const SECTION_TABS = [
  { id: 'general', label: 'General', icon: Tag },
  { id: 'logic', label: 'Logic', icon: GitBranch },
];

const LAYOUT_OPTIONS = [
  { value: '1', icon: LayoutTemplate, label: '1 column' },
  { value: '2', icon: Columns, label: '2 columns' },
  { value: '3', icon: Grid3x3, label: '3 columns' },
  { value: '4', icon: LayoutGrid, label: '4 columns' },
];

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
                  className="w-24 px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[40px]"
                />
                <span className="text-small text-muted">px</span>
              </div>
            </section>

            {/* Text color */}
            <section>
              <label className="block text-small font-medium text-base mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                <label className="relative flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-border shadow-sm"
                    style={{ backgroundColor: style.color || '#000000' }}
                  />
                  <span className="text-small text-muted">{style.color || 'Default'}</span>
                  <input
                    type="color"
                    value={style.color || '#000000'}
                    onChange={(e) => handleStyle({ color: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    aria-label="Text color"
                  />
                </label>
                {style.color && (
                  <button
                    onClick={() => handleStyle({ color: undefined })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-red-500 rounded border border-border hover:border-red-300 transition-colors"
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
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                          className="ml-auto p-1 text-subtle hover:text-red-500 rounded"
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
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                          className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleLogic({
                      conditions: [...(field.conditionalLogic?.conditions || []), { fieldId: '', operator: 'equals', value: '' }],
                    })}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px] transition-colors"
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
                <label className="relative flex items-center gap-2 cursor-pointer">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-border shadow-sm"
                    style={{ backgroundColor: sectionBg || '#ffffff' }}
                  />
                  <span className="text-small text-muted">{sectionBg || 'None'}</span>
                  <input
                    type="color"
                    value={sectionBg || '#ffffff'}
                    onChange={(e) => handleUpdate({ backgroundColor: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                {sectionBg && (
                  <button
                    onClick={() => handleUpdate({ backgroundColor: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-red-500 rounded border border-border hover:border-red-300 transition-colors"
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
                            className="ml-auto p-1 text-subtle hover:text-red-500 rounded"
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
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                            className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                              className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-small focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
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
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px] transition-colors"
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
                <input
                  id="theme-primary"
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => updateFormTheme({ primaryColor: e.target.value })}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                  aria-label="Primary color"
                />
                <span className="text-body text-muted">{theme.primaryColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-button" className="block text-small font-medium text-base mb-1.5">
                Button Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="theme-button"
                  type="color"
                  value={theme.buttonColor}
                  onChange={(e) => updateFormTheme({ buttonColor: e.target.value })}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                  aria-label="Button color"
                />
                <span className="text-body text-muted">{theme.buttonColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-background" className="block text-small font-medium text-base mb-1.5">
                Background Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="theme-background"
                  type="color"
                  value={theme.backgroundColor}
                  onChange={(e) => updateFormTheme({ backgroundColor: e.target.value })}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                  aria-label="Background color"
                />
                <span className="text-body text-muted">{theme.backgroundColor}</span>
              </div>
            </div>
            <div>
              <label htmlFor="theme-text" className="block text-small font-medium text-base mb-1.5">
                Text Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="theme-text"
                  type="color"
                  value={theme.textColor}
                  onChange={(e) => updateFormTheme({ textColor: e.target.value })}
                  className="h-10 w-10 rounded border border-border cursor-pointer"
                  aria-label="Text color"
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
              <textarea
                id="theme-thank-you-message"
                value={theme.thankYouMessage}
                onChange={(e) => updateFormTheme({ thankYouMessage: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted resize-none"
              />
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

  const handleUpdate = (updates) => {
    updateField(field.id, updates);
  };

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

      <div className="flex-1 overflow-y-auto p-4 space-y-6" role="tabpanel">

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <>
          <section>
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
          </section>

          {/* Options for select/checkbox */}
          {(field.type === 'select' || field.type === 'checkbox') && (
            <section>
              <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Options
              </h3>
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
                      className="p-2 text-subtle hover:text-red-500 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
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
            </section>
          )}
        </>
      )}

      {/* ── ADVANCED TAB ── */}
      {activeTab === 'advanced' && (
        <>
          {/* File-specific settings */}
          {field.type === 'file' && (
            <section>
              <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                File Settings
              </h3>
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
            </section>
          )}

          {/* Validation */}
          {(field.type === 'text' || field.type === 'textarea' || field.type === 'number') && (
            <section>
              <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Validation
              </h3>
              <div className="space-y-4">
                {(field.type === 'text' || field.type === 'textarea') && (
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
              </div>
            </section>
          )}

          {/* No advanced settings available */}
          {field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'file' && (
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
                          className="p-2 text-subtle hover:text-red-500 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
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
