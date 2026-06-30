import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Copy, GitBranch, SeparatorHorizontal, Plus, LayoutTemplate, Columns, Grid3x3, Rows3, LayoutGrid, X, CopyPlus, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useFormStore from '../store/formStore';
import { evaluateConditionalLogic, hasConditionalLogic } from '../utils/conditionalLogic';

// Quill toolbar config for content blocks — kept simple for in-canvas editing
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'align', 'link'];

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
        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px] file:mr-4 file:py-2 file:px-4 file:rounded-base file:border-0 file:bg-primary file:text-white file:text-body"
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
      <ReactQuill
        theme="snow"
        value={field.content || ''}
        onChange={(html) => onContentChange && onContentChange(field.id, html)}
        modules={QUILL_MODULES}
        formats={QUILL_FORMATS}
        readOnly={isPreview}
        placeholder="Add your content here…"
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
          <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
            <span className="text-sm">Image placeholder (upload in properties)</span>
          </div>
        )}
      </div>
    );
  },
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

const FieldCard = ({ field, selectedField, onSelectField, onDuplicateField, onDeleteField, dragHandleProps }) => {
  const { updateField } = useFormStore();
  const FieldComponent = FIELD_COMPONENTS[field.type];
  const isSelected = selectedField === field.id;

  const handleContentChange = (fieldId, content) => {
    updateField(fieldId, { content });
  };

  return (
    <div
      className={`group border rounded-base transition-all duration-200 cursor-pointer bg-surface ${isSelected ? 'border-primary shadow-sm ring-1 ring-primary/20' : 'border-border hover:border-border-strong'} ${field.type === 'content' ? 'overflow-hidden' : 'p-4'}`}
      onClick={() => onSelectField(field.id)}
      onMouseDown={() => onSelectField(field.id)}
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
              className="p-1.5 bg-surface/90 backdrop-blur-sm text-subtle hover:text-muted hover:bg-surface-raised rounded border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[30px] min-h-[30px] transition-colors duration-150"
              title="Duplicate block"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDeleteField(field.id)}
              className="p-1.5 bg-surface/90 backdrop-blur-sm text-subtle hover:text-red-500 hover:bg-red-50 rounded border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[30px] min-h-[30px] transition-colors duration-150"
              title="Delete block"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
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
          <div {...dragHandleProps} className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted">
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <label htmlFor={`field-label-${field.id}`} className="sr-only">Field label</label>
              <input
                id={`field-label-${field.id}`}
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Field label"
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-body font-medium placeholder:text-muted"
                aria-label="Field label"
              />
              {field.required && (
                <span className="text-red-500 text-small" aria-label="Required field">*</span>
              )}
              {hasConditionalLogic(field) && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary-light text-primary border border-primary/20"
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
              />
            ) : (
              <p className="text-small text-muted">Unknown field type: {field.type}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { onSelectField(field.id); onDuplicateField(field.id); }}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
              title="Duplicate field"
              aria-label={`Duplicate ${field.label || 'field'}`}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDeleteField(field.id)}
              className="p-2 text-subtle hover:text-red-500 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
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
                        {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
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
      <button
        onClick={onAddRow}
        className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-border rounded-lg text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[120px]"
        aria-label="Add row"
      >
        <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center">
          <Rows3 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-body font-medium">Add row</p>
          <p className="text-small text-muted mt-1">Create your first row to start adding fields</p>
        </div>
      </button>
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

  return (
    <DragDropContext onDragEnd={handleRowDragEnd}>
      <Droppable droppableId="sections" type="ROW">
        {(droppableProvided) => (
    <div className="space-y-0" ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
      {rows.map((row, rowIndex) => {
        const rowFields = fields.filter((f) => f.rowId === row.id);
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

            {/* Section card */}
            <div
              className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                draggableSnapshot.isDragging
                  ? 'border-primary shadow-xl'
                  : isSelectedSection
                  ? 'border-primary shadow-sm'
                  : 'border-border'
              }`}
              style={sectionBg ? { backgroundColor: sectionBg } : {}}
            >
              {/* Section header — click to select section */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 border-b border-border/60 cursor-pointer select-none transition-colors ${
                  isSelectedSection ? 'bg-primary-light/60' : 'bg-surface/80 hover:bg-surface-raised'
                }`}
                onClick={() => onSelectSection(isSelectedSection ? null : row.id)}
                role="button"
                aria-expanded={!isCollapsed}
                aria-label={`Section ${rowIndex + 1}: ${row.label || 'Untitled'}`}
              >
                {/* Drag handle */}
                <div
                  {...draggableProvided.dragHandleProps}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 p-1 mr-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted rounded"
                  title="Drag to reorder"
                  aria-label="Drag to reorder section"
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Collapse toggle */}
                <button
                  onClick={(e) => toggleCollapse(row.id, e)}
                  className="flex-shrink-0 p-1 mr-2 text-subtle hover:text-muted rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                  aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  {isCollapsed
                    ? <ChevronRight className="h-4 w-4" />
                    : <ChevronDown className="h-4 w-4" />
                  }
                </button>

                {/* Section name + field count */}
                <div className="flex-1 min-w-0">
                  <span className="text-small font-semibold text-base truncate">
                    {row.label || `Section ${rowIndex + 1}`}
                  </span>
                  {isCollapsed && (
                    <span className="ml-2 text-xs text-muted">
                      {rowFields.length} field{rowFields.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  {/* Duplicate */}
                  <button
                    onClick={() => onDuplicateRow(row.id)}
                    className="p-1.5 text-subtle hover:text-primary hover:bg-primary-light rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    title="Duplicate section"
                    aria-label="Duplicate section"
                  >
                    <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>

                  {/* Delete */}
                  {rows.length > 1 && (
                    <button
                      onClick={() => onRemoveRow(row.id)}
                      className="p-1.5 text-subtle hover:text-red-500 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Remove section"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section body (collapsible) */}
              {!isCollapsed && (
                <div className="p-4">
                  {rowFields.length === 0 ? (
                    <button
                      onClick={() => onInsertField(row.id)}
                      className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-lg text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      aria-label="Insert new field into this section"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                      <span className="text-body font-medium">Insert new field</span>
                    </button>
                  ) : (
                    <>
                      <DragDropContext onDragEnd={handleDragEnd(row.id)}>
                        <Droppable droppableId={row.id}>
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`grid ${gridClass} gap-3`}
                            >
                              {rowFields.map((field, index) => (
                                <Draggable key={field.id} draggableId={field.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`${snapshot.isDragging ? 'shadow-lg' : ''} rounded-base`}
                                    >
                                      <FieldCard
                                        field={field}
                                        selectedField={selectedField}
                                        onSelectField={onSelectField}
                                        onDuplicateField={onDuplicateField}
                                        onDeleteField={onDeleteField}
                                        dragHandleProps={provided.dragHandleProps}
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
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-lg text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
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
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-subtle hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[48px]"
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
