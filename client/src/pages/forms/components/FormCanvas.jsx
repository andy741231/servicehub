import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Copy, GitBranch, SeparatorHorizontal, Plus, LayoutTemplate, Columns, Grid3x3, Rows3, LayoutGrid, X, CopyPlus, ChevronDown, ChevronRight, Settings2, Star, Calculator, Repeat, FolderOpen } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import RichTextEditor from '../../../components/RichTextEditor';
import useFormStore from '../store/formStore';
import { evaluateConditionalLogic, hasConditionalLogic } from '../utils/conditionalLogic';
import { getFormulaPreview } from '../utils/formula';
import { FIELD_TYPES, accentFor } from './FieldPalette';
import { TEMPLATES } from '../FormTemplates';

// Short label + category lookup per field type — used for the field-type badge on cards
const FIELD_META = FIELD_TYPES.reduce((acc, { type, label, category }) => {
  acc[type] = { label, category };
  return acc;
}, {});

// Quick-add field types shown in empty states (one-click common fields)
const QUICK_ADD_TYPES = [
  { type: 'text', label: 'Text' },
  { type: 'email', label: 'Email' },
  { type: 'textarea', label: 'Long Text' },
  { type: 'select', label: 'Dropdown' },
  { type: 'phone', label: 'Phone' },
];

const FIELD_COMPONENTS = {
  text: ({ field, isPreview }) => (
    <input
      type="text"
      id={field.id}
      placeholder={field.placeholder || field.label || 'Short text'}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
      aria-label={field.label || 'Short text input'}
      aria-required={field.required}
    />
  ),
  textarea: ({ field, isPreview }) => (
    <textarea
      id={field.id}
      placeholder={field.placeholder || field.label || 'Long text'}
      disabled={isPreview}
      rows={3}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted resize-none"
      aria-label={field.label || 'Long text input'}
      aria-required={field.required}
    />
  ),
  number: ({ field, isPreview }) => (
    <input
      type="number"
      id={field.id}
      placeholder={field.placeholder || field.label || 'Number'}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
      aria-label={field.label || 'Number input'}
      aria-required={field.required}
      min={field.minValue}
      max={field.maxValue}
    />
  ),
  email: ({ field, isPreview }) => (
    <input
      type="email"
      id={field.id}
      placeholder={field.placeholder || field.label || 'Email address'}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
      aria-label={field.label || 'Email input'}
      aria-required={field.required}
    />
  ),
  phone: ({ field, isPreview }) => (
    <input
      type="tel"
      id={field.id}
      placeholder={field.placeholder || field.label || 'Phone number'}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
      aria-label={field.label || 'Phone input'}
      aria-required={field.required}
    />
  ),
  date: ({ field, isPreview }) => (
    <input
      type="date"
      id={field.id}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
      aria-label={field.label || 'Date input'}
      aria-required={field.required}
    />
  ),
  select: ({ field, isPreview }) => (
    <select
      id={field.id}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
      aria-label={field.label || 'Dropdown selection'}
      aria-required={field.required}
    >
      <option value="">Select an option</option>
      {field.options?.map((option, index) => (
        <option key={index} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
  checkbox: ({ field, isPreview }) => (
    <fieldset className="space-y-2" aria-label={field.label || 'Checkbox options'}>
      <legend className="sr-only">{field.label || 'Options'}</legend>
      {field.options?.map((option, index) => (
        <label key={index} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id={`${field.id}-${index}`}
            disabled={isPreview}
            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
            aria-label={option}
          />
          <span className="text-body">{option}</span>
        </label>
      ))}
    </fieldset>
  ),
  file: ({ field, isPreview }) => (
    <div className="space-y-2">
      <input
        type="file"
        id={field.id}
        disabled={isPreview}
        accept={field.accept || undefined}
        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px] file:mr-4 file:py-2 file:px-4 file:rounded-base file:border-0 file:bg-primary file:text-primary-foreground file:text-body"
        aria-label={field.label || 'File upload'}
      />
      {field.maxSize && (
        <p className="text-small text-muted">Max file size: {field.maxSize}MB</p>
      )}
    </div>
  ),
  pageBreak: ({ field, isPreview }) => (
    <div className="flex items-center gap-4 py-2" aria-label="Page break">
      <div className="h-px bg-border flex-1" />
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-light text-primary rounded-full text-small font-medium">
        <SeparatorHorizontal className="h-4 w-4" aria-hidden="true" />
        Page Break
      </div>
      <div className="h-px bg-border flex-1" />
    </div>
  ),
  content: ({ field, isPreview, onContentChange }) => (
    <div
      className="content-block-quill rounded-base overflow-hidden border border-border"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <RichTextEditor
        value={field.content || ''}
        onChange={(html) => onContentChange && onContentChange(field.id, html)}
        placeholder="Add your content here…"
        minHeight={120}
      />
    </div>
  ),
  image: ({ field }) => {
    const bs = field.blockStyle || {};
    const inlineStyle = {
      textAlign: bs.textAlign || 'center',
      paddingTop: bs.paddingTop != null ? `${bs.paddingTop}px` : undefined,
      paddingBottom: bs.paddingBottom != null ? `${bs.paddingBottom}px` : undefined,
      paddingLeft: bs.paddingLeft != null ? `${bs.paddingLeft}px` : undefined,
      paddingRight: bs.paddingRight != null ? `${bs.paddingRight}px` : undefined,
    };
    return (
      <div style={inlineStyle}>
        {field.imageUrl ? (
          <img src={field.imageUrl} alt={field.label || 'Image'} style={{ maxWidth: bs.width ? `${bs.width}px` : '100%', height: 'auto', display: 'inline-block', borderRadius: '8px' }} />
        ) : (
          <div className="w-full h-32 bg-surface-raised border-2 border-dashed border-border rounded-lg flex items-center justify-center text-subtle">
            <span className="text-sm">Image placeholder (upload in properties)</span>
          </div>
        )}
      </div>
    );
  },
  url: ({ field, isPreview }) => (
    <input
      type="url"
      id={field.id}
      placeholder={field.placeholder || field.label || 'https://example.com'}
      disabled={isPreview}
      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
      aria-label={field.label || 'Website input'}
      aria-required={field.required}
    />
  ),
  rating: ({ field, isPreview }) => {
    const max = field.maxStars || 5;
    return (
      <div className="flex items-center gap-1" aria-label={field.label || 'Rating'}>
        {Array.from({ length: max }).map((_, i) => (
          <Star key={i} className="h-6 w-6 text-subtle" aria-hidden="true" />
        ))}
        <span className="ml-2 text-small text-muted">0 / {max}</span>
      </div>
    );
  },
  slider: ({ field, isPreview }) => {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    return (
      <div className="space-y-1">
        <input
          type="range"
          min={min}
          max={max}
          step={field.step || 1}
          disabled={isPreview}
          defaultValue={min}
          className="w-full accent-primary"
          aria-label={field.label || 'Slider'}
          aria-required={field.required}
        />
        <div className="flex justify-between text-small text-muted">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  },
  signature: ({ field, isPreview }) => (
    <div className="w-full h-28 bg-background border-2 border-dashed border-border rounded-base flex items-center justify-center text-muted text-small">
      Signature pad (active in live form)
    </div>
  ),
  name: ({ field, isPreview }) => (
    <div className="grid grid-cols-2 gap-3">
      <input
        type="text"
        placeholder="First name"
        disabled={isPreview}
        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
        aria-label={`${field.label || 'Name'} first`}
      />
      <input
        type="text"
        placeholder="Last name"
        disabled={isPreview}
        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
        aria-label={`${field.label || 'Name'} last`}
      />
    </div>
  ),
  address: ({ field, isPreview }) => (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Street address"
        disabled={isPreview}
        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
        aria-label={`${field.label || 'Address'} street`}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="City"
          disabled={isPreview}
          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          aria-label={`${field.label || 'Address'} city`}
        />
        <input
          type="text"
          placeholder="State / Province"
          disabled={isPreview}
          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          aria-label={`${field.label || 'Address'} state`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="ZIP / Postal code"
          disabled={isPreview}
          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          aria-label={`${field.label || 'Address'} zip`}
        />
        <input
          type="text"
          placeholder="Country"
          disabled={isPreview}
          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          aria-label={`${field.label || 'Address'} country`}
        />
      </div>
    </div>
  ),
  computed: ({ field }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary-light/40 border border-primary/20 rounded-base">
      <Calculator className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-body font-semibold text-primary">
          {getFormulaPreview(field.formula, field.displayFormat)}
        </div>
        <div className="text-xs text-muted truncate">
          {field.formula ? `Formula: ${field.formula}` : 'Set a formula in properties →'}
        </div>
      </div>
      <span className="text-xs text-muted">auto-calculated</span>
    </div>
  ),
  repeatingGroup: ({ field, childFields = [], onAddToGroup, onRenderChild }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base">
        <Repeat className="h-4 w-4 text-subtle" aria-hidden="true" />
        <span className="text-small text-muted">
          Repeating group — users can add {field.minInstances || 1} to {field.maxInstances || '∞'} entries
        </span>
      </div>
      {childFields.length > 0 ? (
        <div className="space-y-2 p-2 border-2 border-dashed border-border rounded-base bg-surface/50">
          {childFields.map((child) => onRenderChild ? onRenderChild(child) : null)}
        </div>
      ) : (
        <div className="p-3 border-2 border-dashed border-border rounded-base text-center text-small text-muted">
          Add fields inside this group, then users can repeat them.
        </div>
      )}
      {onAddToGroup && (
        <button
          onClick={onAddToGroup}
          className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-primary/40 rounded-base text-small text-primary hover:border-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Plus className="h-4 w-4" />
          Add field to group
        </button>
      )}
    </div>
  ),
};

const LAYOUT_CLASS = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const LAYOUT_OPTIONS = [
  { value: '1', icon: LayoutTemplate, label: '1 column' },
  { value: '2', icon: Columns, label: '2 columns' },
  { value: '3', icon: Grid3x3, label: '3 columns' },
  { value: '4', icon: LayoutGrid, label: '4 columns' },
];

const FieldCard = ({ field, selectedField, onSelectField, onDuplicateField, onDeleteField, dragHandleProps, allFields, onAddToGroup, onRenderChild }) => {
  const { updateField } = useFormStore();
  const FieldComponent = FIELD_COMPONENTS[field.type];
  const isSelected = selectedField === field.id;
  const labelRef = useRef(null);

  // Auto-focus the label input when a freshly-added field has no label yet.
  // A field is considered "new" if its id timestamp is within the last 3 seconds.
  useEffect(() => {
    if (!field.label && labelRef.current) {
      const ts = parseInt(field.id.replace(/^field-/, ''), 10);
      if (!Number.isNaN(ts) && Date.now() - ts < 3000) {
        labelRef.current.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.id]);

  const handleContentChange = (fieldId, content) => {
    updateField(fieldId, { content });
  };

  // Keyboard navigation: Enter opens properties (selects), Delete/Backspace removes, Ctrl+D duplicates
  const handleKeyDown = (e) => {
    // Don't intercept when typing in inputs/labels inside the card
    const tag = e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target.isContentEditable) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelectField(field.id);
    } else if (e.key === 'Delete' || (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      onDeleteField(field.id);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      onDuplicateField(field.id);
    }
  };

  return (
    <div
      tabIndex={0}
      className={`group relative field-card bg-surface border rounded-base transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        isSelected
          ? 'border-2 border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
          : 'border border-border'
      } ${field.type === 'content' ? 'overflow-hidden' : 'p-3.5'}`}
      onClick={() => onSelectField(field.id)}
      onMouseDown={() => onSelectField(field.id)}
      onKeyDown={handleKeyDown}
      aria-label={`Field: ${field.label || field.type}. Press Enter to edit, Delete to remove, Ctrl+D to duplicate.`}
    >
      {field.type === 'content' ? (
        /* ── Content block: full-width WYSIWYG, controls float above ── */
        <div className="relative">
          {/* Floating action bar */}
          <div
            className={`absolute top-2 right-2 z-10 flex items-center gap-1 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {hasConditionalLogic(field) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary-light text-primary border border-primary/20 shadow-sm">
                <GitBranch className="h-3 w-3" />
                Logic
              </span>
            )}
            <button
              onClick={() => { onSelectField(field.id); onDuplicateField(field.id); }}
              className="flex items-center justify-center p-2 bg-surface/90 backdrop-blur-sm text-subtle hover:text-muted hover:bg-surface-raised rounded-base border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
              title="Duplicate block"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDeleteField(field.id)}
              className="flex items-center justify-center p-2 bg-surface/90 backdrop-blur-sm text-subtle hover:text-danger hover:bg-danger-light rounded-base border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
              title="Delete block"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {/* Drag handle — pill background on hover */}
          <div
            {...dragHandleProps}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 cursor-grab active:cursor-grabbing text-subtle hover:text-muted rounded-lg hover:bg-surface-raised opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onMouseDown={(e) => e.stopPropagation()}
            title="Drag to reorder"
            aria-label="Drag to reorder content block"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <FieldComponent
            field={field}
            isPreview={false}
            onContentChange={handleContentChange}
          />
        </div>
      ) : (
        /* ── Regular field: label + input + actions ── */
        <div className="flex items-start gap-3">
          {/* Drag handle — 24px icon with pill background on hover */}
          <div
            {...dragHandleProps}
            className="flex-shrink-0 p-1.5 -ml-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted rounded-lg hover:bg-surface-raised transition-colors duration-150"
            title="Drag to reorder"
            aria-label="Drag to reorder field"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <label htmlFor={`field-label-${field.id}`} className="sr-only">Field label for {field.type}</label>
              <input
                ref={labelRef}
                id={`field-label-${field.id}`}
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Field label"
                className="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none focus:ring-0 text-body font-medium placeholder:text-muted"
                aria-label={`Field label for ${field.type}`}
              />
              {/* Field-type badge — category accent colour, aids scanning */}
              {(() => {
                const meta = FIELD_META[field.type];
                if (!meta) return null;
                return (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-light text-primary font-medium flex-shrink-0">
                    {meta.label}
                  </span>
                );
              })()}
              {field.required && (
                <span className="text-danger text-small flex-shrink-0" aria-label="Required field">*</span>
              )}
              {hasConditionalLogic(field) && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary-light text-primary border border-primary/20 flex-shrink-0"
                  title="This field has conditional logic"
                >
                  <GitBranch className="h-3 w-3" />
                  Logic
                </span>
              )}
            </div>

            {FieldComponent ? (
              <FieldComponent
                field={field}
                isPreview={false}
                onContentChange={handleContentChange}
                childFields={field.type === 'repeatingGroup' ? (allFields || []).filter((f) => f.groupId === field.id) : undefined}
                onAddToGroup={field.type === 'repeatingGroup' ? onAddToGroup : undefined}
                onRenderChild={field.type === 'repeatingGroup' ? onRenderChild : undefined}
              />
            ) : (
              <p className="text-small text-muted">Unknown field type: {field.type}</p>
            )}
          </div>

          {/* Action buttons — 40px targets, floating style, press feedback */}
          <div
            className={`flex items-center gap-1 flex-shrink-0 transition-opacity duration-150 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { onSelectField(field.id); onDuplicateField(field.id); }}
              className="flex items-center justify-center p-2 bg-surface/90 backdrop-blur-sm text-subtle hover:text-muted hover:bg-surface-raised rounded-base border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
              title="Duplicate field"
              aria-label={`Duplicate ${field.label || 'field'}`}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDeleteField(field.id)}
              className="flex items-center justify-center p-2 bg-surface/90 backdrop-blur-sm text-subtle hover:text-danger hover:bg-danger-light rounded-base border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
              title="Delete field"
              aria-label={`Delete ${field.label || 'field'}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function FormCanvas({
  fields,
  rows,
  onSelectField,
  onDeleteField,
  onDuplicateField,
  onInsertField,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onDuplicateRow,
  onReorderRows,
  selectedField,
  selectedSection,
  onSelectSection,
  isPreview = false,
  formData = {},
  onStartBuilding,
  onAddToGroup,
  onUseTemplate,
}) {
  const { reorderFields, updateField } = useFormStore();
  const [collapsedRows, setCollapsedRows] = useState({});

  const toggleCollapse = (rowId, e) => {
    e.stopPropagation();
    setCollapsedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const handleRowDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    onReorderRows(result.source.index, result.destination.index);
  };

  const handleContentChange = (fieldId, content) => {
    updateField(fieldId, { content });
  };

  if (isPreview) {
    const visibleFields = fields.filter((field) =>
      evaluateConditionalLogic(field.conditionalLogic, formData)
    );

    return (
      <div className="space-y-8" role="form" aria-label="Form preview">
        {rows.map((row) => {
          const rowFields = visibleFields.filter((f) => f.rowId === row.id);
          if (!rowFields.length) return null;
          const gridClass = LAYOUT_CLASS[row.columns] || 'grid-cols-1';
          return (
            <div key={row.id} className={`grid ${gridClass} gap-6`}>
              {rowFields.map((field) => {
                const FieldComponent = FIELD_COMPONENTS[field.type];
                return (
                  <div key={field.id} className="space-y-2">
                    {field.type !== 'content' && field.type !== 'pageBreak' && (
                      <label
                        htmlFor={field.id}
                        className="block text-body font-medium text-base"
                      >
                        {field.label || 'Untitled field'}
                        {field.required && <span className="text-danger ml-1" aria-label="required">*</span>}
                      </label>
                    )}
                    {FieldComponent ? (
                      <FieldComponent
                        field={field}
                        isPreview={isPreview}
                        onContentChange={handleContentChange}
                      />
                    ) : (
                      <p className="text-small text-muted">Unknown field type: {field.type}</p>
                    )}
                    {field.helpText && (
                      <p className="text-small text-muted" id={`${field.id}-help`}>
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const handleDragEnd = (rowId) => (result) => {
    if (!result.destination) return;
    reorderFields(rowId, result.source.index, result.destination.index);
  };

  if (!rows.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 px-6 py-12 text-center transition-all duration-200">
        {/* Hero icon cluster with soft gradient */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-light to-primary-light/40 flex items-center justify-center mb-5 shadow-card">
          <Rows3 className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
        <h3 className="text-heading font-bold text-base">Start building your form</h3>
        <p className="mt-1.5 text-body text-muted max-w-md mx-auto">
          Drag fields from the left panel, or choose a template to start fast.
        </p>

        {/* Primary CTA + secondary */}
        <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
          <button
            onClick={onStartBuilding}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium shadow-sm transition-all duration-150 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add your first field
          </button>
          <button
            onClick={onAddRow}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-base transition-all duration-150 active:scale-95"
          >
            <Rows3 className="h-4 w-4 text-subtle" aria-hidden="true" />
            Add empty section
          </button>
        </div>

        {/* Quick-add row — one-click common field types */}
        <div className="mt-5 flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-small text-subtle mr-1">Quick add:</span>
          {QUICK_ADD_TYPES.map(({ type, label }) => {
            const meta = FIELD_META[type];
            const accent = meta ? accentFor(meta.category) : null;
            return (
              <button
                key={type}
                onClick={() => onStartBuilding && onInsertField(null)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-small font-medium border border-border bg-surface hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${accent ? accent.chip : ''}`}
                title={`Add a ${label} field`}
                aria-label={`Add a ${label} field`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Template cards */}
        {onUseTemplate && TEMPLATES.length > 0 && (
          <div className="mt-8">
            <p className="text-small font-medium text-muted mb-3">Or start from a template:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-2xl mx-auto text-left">
              {TEMPLATES.slice(0, 6).map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onUseTemplate(tpl)}
                    className="group flex items-center gap-3 p-3 border border-border rounded-base bg-surface hover:border-primary hover:elevation-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary text-left"
                    aria-label={`Use ${tpl.title} template`}
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${tpl.color} flex items-center justify-center text-primary-foreground shadow-sm`}>
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body font-medium text-base truncate">{tpl.title}</div>
                      <div className="text-xs text-muted truncate">{tpl.fields.length} fields</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-6 text-small text-subtle">
          Tip: press <kbd className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-small font-medium">/</kbd> anywhere to add a field fast.
        </p>
      </div>
    );
  }

  // Inline add-row button rendered between rows
  const InlineAddRow = ({ afterRowId }) => (
    <div className="relative h-6 group flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border group-hover:bg-primary/40 transition-colors" />
      <button
        onClick={() => onAddRow(afterRowId)}
        className="relative z-10 flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-surface border border-border rounded-full text-subtle hover:text-primary hover:border-primary hover:bg-primary-light opacity-0 group-hover:opacity-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:opacity-100"
        aria-label="Add section below"
      >
        <Plus className="h-3 w-3" />
        Add section
      </button>
    </div>
  );

  // Inline add-field button rendered between fields (only in 1-column sections)
  const InlineAddField = ({ rowId }) => (
    <div className="relative h-5 group/add-field flex items-center justify-center col-span-full">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border group-hover/add-field:bg-primary/40 transition-colors" />
      <button
        onClick={() => onInsertField(rowId)}
        className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-border text-subtle hover:text-primary hover:border-primary hover:bg-primary-light opacity-0 group-hover/add-field:opacity-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:opacity-100"
        aria-label="Insert field here"
        title="Insert field here"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <DragDropContext onDragEnd={handleRowDragEnd}>
      <Droppable droppableId="sections" type="ROW">
        {(droppableProvided) => (
    <div className="space-y-2" ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
      {rows.map((row, rowIndex) => {
        const rowFields = fields.filter((f) => f.rowId === row.id && !f.groupId);
        const gridClass = LAYOUT_CLASS[row.columns] || 'grid-cols-1';
        const sectionBg = row.backgroundColor || '';

        const isCollapsed = !!collapsedRows[row.id];
        const isSelectedSection = selectedSection === row.id;

        return (
          <Draggable key={row.id} draggableId={row.id} index={rowIndex}>
            {(draggableProvided, draggableSnapshot) => (
          <div ref={draggableProvided.innerRef} {...draggableProvided.draggableProps}>
            {/* Inline add-row between sections */}
            {rowIndex > 0 && <InlineAddRow afterRowId={rows[rowIndex - 1].id} />}

            {/* Section card — rounded-card with shadow, ring when selected/dragging */}
            <div
              id={`section-${row.id}`}
              className={`relative rounded-card border border-border shadow-card overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                draggableSnapshot.isDragging
                  ? 'border-primary ring-2 ring-primary/30'
                  : isSelectedSection
                  ? 'border-primary ring-2 ring-primary/20'
                  : ''
              }`}
              style={sectionBg ? { backgroundColor: sectionBg } : {}}
            >
              {/* Section header — click to select section */}
              <div
                className={`group/section flex items-center justify-between px-5 py-3.5 border-b border-border-soft cursor-pointer select-none transition-colors ${
                  isSelectedSection ? 'bg-primary-light/40' : 'bg-surface hover:bg-surface-raised/50'
                }`}
                onClick={() => onSelectSection(isSelectedSection ? null : row.id)}
                role="button"
                aria-expanded={!isCollapsed}
                aria-label={`Section ${rowIndex + 1}: ${row.label || 'Untitled'}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Drag handle */}
                  <div
                    {...draggableProvided.dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted rounded"
                    title="Drag to reorder"
                    aria-label="Drag to reorder section"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Collapse toggle */}
                  <button
                    onClick={(e) => toggleCollapse(row.id, e)}
                    className="flex-shrink-0 p-1 text-subtle hover:text-base rounded focus:outline-none focus:ring-2 focus:ring-primary transition-transform duration-200"
                    title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>

                  {/* Folder icon + section name + field count text */}
                  <FolderOpen className="flex-shrink-0 h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold text-base truncate">
                    {row.label || `Section ${rowIndex + 1}`}
                  </span>
                  <span className="flex-shrink-0 text-xs text-subtle">
                    {rowFields.length} field{rowFields.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Action buttons — hover-revealed, 32px targets */}
                <div
                  className={`flex items-center gap-0.5 flex-shrink-0 ml-2 transition-opacity duration-150 ${isSelectedSection ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100 focus-within:opacity-100'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Duplicate */}
                  <button
                    onClick={() => onDuplicateRow(row.id)}
                    className="flex items-center justify-center w-8 h-8 text-subtle hover:text-primary hover:bg-primary-light rounded-base transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 active:scale-95"
                    title="Duplicate section"
                    aria-label="Duplicate section"
                  >
                    <CopyPlus className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {/* Delete */}
                  {rows.length > 1 && (
                    <button
                      onClick={() => onRemoveRow(row.id)}
                      className="flex items-center justify-center w-8 h-8 text-subtle hover:text-danger hover:bg-danger-light rounded-base transition-all focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 active:scale-95"
                      title="Remove section"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section body (collapsible) */}
              {!isCollapsed && (
                <div className="p-5">
                  {rowFields.length === 0 ? (
                    <div className="rounded-base border border-dashed border-border-strong bg-background/50 px-4 py-6 text-center transition-all duration-200">
                      <div className="mx-auto w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center mb-2.5">
                        <Plus className="h-5 w-5 text-subtle" aria-hidden="true" />
                      </div>
                      <p className="text-body text-muted mb-3">This section is empty</p>
                      <button
                        onClick={() => onInsertField(row.id)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-small font-medium transition-all duration-150 active:scale-95"
                        aria-label="Insert new field into this section"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Insert field
                      </button>
                      {/* Quick-add row — one-click common field types */}
                      <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                        {QUICK_ADD_TYPES.map(({ type, label }) => {
                          const meta = FIELD_META[type];
                          const accent = meta ? accentFor(meta.category) : null;
                          return (
                            <button
                              key={type}
                              onClick={() => onInsertField(row.id)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-border bg-surface hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${accent ? accent.chip : ''}`}
                              title={`Add a ${label} field`}
                              aria-label={`Add a ${label} field to this section`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      <DragDropContext onDragEnd={handleDragEnd(row.id)}>
                        <Droppable droppableId={row.id}>
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`grid ${gridClass} gap-4`}
                            >
                              {rowFields.map((field, index) => (
                                <Draggable key={field.id} draggableId={field.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      id={`field-${field.id}`}
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 scale-[1.02]' : ''} rounded-base transition-all duration-150`}
                                    >
                                      <FieldCard
                                        field={field}
                                        selectedField={selectedField}
                                        onSelectField={onSelectField}
                                        onDuplicateField={onDuplicateField}
                                        onDeleteField={onDeleteField}
                                        dragHandleProps={provided.dragHandleProps}
                                        allFields={fields}
                                        onAddToGroup={() => onAddToGroup(field.id)}
                                        onRenderChild={(child) => (
                                          <div
                                            key={child.id}
                                            className="group/child relative border rounded-base border-border bg-surface p-3 cursor-pointer hover:border-border-strong transition-colors"
                                            onClick={(e) => { e.stopPropagation(); onSelectField(child.id); }}
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-small font-medium text-base">{child.label || 'Untitled field'}</span>
                                              <span className="text-xs text-subtle uppercase">{child.type}</span>
                                            </div>
                                            <p className="text-xs text-muted">Click to edit this group field</p>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); onDeleteField(child.id); }}
                                              className="absolute top-1.5 right-1.5 p-1 text-subtle hover:text-danger hover:bg-danger-light rounded opacity-0 group-hover/child:opacity-100 transition-opacity"
                                              title="Remove from group"
                                              aria-label="Remove field from group"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                      />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                      <button
                        onClick={() => onInsertField(row.id)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border-strong rounded-base text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        aria-label="Insert new field after existing fields in this section"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span className="text-small font-medium">Insert new field</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
            )}
          </Draggable>
        );
      })}
      {droppableProvided.placeholder}

      {/* Inline add after last row */}
      {rows.length > 0 && <InlineAddRow afterRowId={rows[rows.length - 1].id} />}

      <button
        onClick={() => onAddRow()}
        className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-strong rounded-card text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[48px]"
        aria-label="Add new section"
      >
        <Rows3 className="h-4 w-4" aria-hidden="true" />
        <span className="text-body font-medium">Add section</span>
      </button>
    </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
