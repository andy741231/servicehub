import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Copy, GitBranch, Star, Upload, PenTool } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useFormStore from '../store/formStore';
import { evaluateConditionalLogic, hasConditionalLogic } from '../utils/conditionalLogic';

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
  rating: ({ field, isPreview }) => {
    const maxStars = field.maxStars || 5;
    return (
      <div className="flex items-center gap-1" aria-label={field.label || 'Star rating'}>
        {Array.from({ length: maxStars }).map((_, index) => (
          <Star
            key={index}
            className={`h-6 w-6 ${isPreview ? 'text-gray-300' : 'text-subtle'}`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  },
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
  signature: ({ field, isPreview }) => (
    <div className="space-y-2">
      <div className="w-full h-32 bg-background border border-border rounded-base flex items-center justify-center">
        <PenTool className="h-8 w-8 text-subtle" aria-hidden="true" />
        <span className="sr-only">Signature pad</span>
      </div>
      <button
        type="button"
        disabled={isPreview}
        className="px-3 py-2 text-small text-muted border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
      >
        Clear signature
      </button>
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
  content: ({ field, isPreview, onContentChange }) => {
    const modules = {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ],
    };

    const formats = [
      'header',
      'bold', 'italic', 'underline', 'strike',
      'list', 'bullet',
      'link'
    ];

    return (
      <div className="bg-background border border-border rounded-base">
        <ReactQuill
          theme="snow"
          value={field.content || ''}
          onChange={(content) => onContentChange && onContentChange(field.id, content)}
          modules={modules}
          formats={formats}
          readOnly={isPreview}
          placeholder="Add your content here..."
          className="min-h-[150px]"
        />
      </div>
    );
  },
  grid: ({ field, isPreview, onAddFieldToGrid, onRemoveFieldFromGrid, onUpdateGridField, onSelectField, onDeleteField, onDuplicateField, selectedField, onAddField }) => {
    const columnCount = field.columnCount || 2;
    const columns = field.columns || Array(columnCount).fill([]);

    const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
    }[columnCount] || 'grid-cols-2';

    const handleAddFieldToColumn = (colIndex, fieldType) => {
      const newField = {
        id: `field-${Date.now()}`,
        type: fieldType,
        label: '',
        placeholder: '',
        required: false,
        options: fieldType === 'select' || fieldType === 'checkbox' ? [''] : [],
        content: fieldType === 'content' ? '' : undefined,
      };
      onAddFieldToGrid && onAddFieldToGrid(field.id, colIndex, newField);
    };

    if (isPreview) {
      return (
        <div className={`grid ${gridCols} gap-4`}>
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {column.map((gridField) => {
                const FieldComponent = FIELD_COMPONENTS[gridField.type];
                return (
                  <div key={gridField.id} className="space-y-2">
                    {gridField.type !== 'content' && (
                      <label
                        htmlFor={gridField.id}
                        className="block text-body font-medium text-base"
                      >
                        {gridField.label || 'Untitled field'}
                        {gridField.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    {FieldComponent ? (
                      <FieldComponent field={gridField} isPreview={isPreview} />
                    ) : (
                      <p className="text-small text-muted">Unknown field type: {gridField.type}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`grid ${gridCols} gap-4`}>
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="min-h-[100px] border-2 border-dashed border-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-small text-muted">Column {colIndex + 1}</div>
              <select
                onChange={(e) => handleAddFieldToColumn(colIndex, e.target.value)}
                className="text-small px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                value=""
              >
                <option value="">+ Add Field</option>
                <option value="text">Text</option>
                <option value="textarea">Long Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="date">Date</option>
                <option value="select">Dropdown</option>
                <option value="checkbox">Checkbox</option>
                <option value="content">Content Block</option>
              </select>
            </div>
            {column.map((gridField) => (
              <div
                key={gridField.id}
                onClick={() => onSelectField(gridField.id)}
                className={`p-3 border rounded-base cursor-pointer ${
                  selectedField === gridField.id
                    ? 'border-primary bg-primary-light'
                    : 'border-border bg-surface hover:border-border-dark'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body font-medium">{gridField.label || gridField.type}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateField(gridField.id);
                      }}
                      className="p-1 text-subtle hover:text-muted"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFieldFromGrid(field.id, gridField.id);
                      }}
                      className="p-1 text-subtle hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-small text-muted">{gridField.type}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
};

export default function FormCanvas({ fields, onSelectField, onDeleteField, onDuplicateField, selectedField, isPreview = false, formData = {} }) {
  const { reorderFields, updateField, addFieldToGrid, removeFieldFromGrid, updateGridField } = useFormStore();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    reorderFields(result.source.index, result.destination.index);
  };

  const handleContentChange = (fieldId, content) => {
    updateField(fieldId, { content });
  };

  const handleRemoveFieldFromGrid = (gridId, fieldId) => {
    removeFieldFromGrid(gridId, fieldId);
  };

  const handleAddFieldToGrid = (gridId, columnIndex, field) => {
    addFieldToGrid(gridId, columnIndex, field);
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body text-muted">No fields added yet</p>
        <p className="text-small text-muted mt-1">Click on field types from the left panel to add them</p>
      </div>
    );
  }

  if (isPreview) {
    const visibleFields = fields.filter((field) =>
      evaluateConditionalLogic(field.conditionalLogic, formData)
    );

    return (
      <div className="space-y-6" role="form" aria-label="Form preview">
        {visibleFields.map((field) => {
          const FieldComponent = FIELD_COMPONENTS[field.type];
          return (
            <div key={field.id} className="space-y-2">
              {field.type !== 'content' && (
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
                  onAddFieldToGrid={handleAddFieldToGrid}
                  onRemoveFieldFromGrid={handleRemoveFieldFromGrid}
                  onUpdateGridField={updateGridField}
                  onSelectField={onSelectField}
                  onDeleteField={onDeleteField}
                  onDuplicateField={onDuplicateField}
                  selectedField={selectedField}
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
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="form-fields">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
            {fields.map((field, index) => {
              const FieldComponent = FIELD_COMPONENTS[field.type];
              return (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      onClick={() => onSelectField(field.id)}
                      className={`p-4 border rounded-base transition-all duration-200 cursor-pointer ${
                        selectedField === field.id
                          ? 'border-primary bg-primary-light'
                          : 'border-border bg-surface hover:border-border-dark'
                      } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          {...provided.dragHandleProps}
                          className="flex-shrink-0 p-1 cursor-grab active:cursor-grabbing text-subtle hover:text-muted"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {field.type !== 'content' && (
                            <div className="flex items-center gap-2 mb-2">
                              <label htmlFor={`field-label-${field.id}`} className="sr-only">Field label</label>
                              <input
                                id={`field-label-${field.id}`}
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  updateField(field.id, { label: e.target.value });
                                }}
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
                          )}

                          {FieldComponent ? (
                            <FieldComponent
                              field={field}
                              isPreview={false}
                              onContentChange={handleContentChange}
                              onAddFieldToGrid={handleAddFieldToGrid}
                              onRemoveFieldFromGrid={handleRemoveFieldFromGrid}
                              onUpdateGridField={updateGridField}
                              onSelectField={onSelectField}
                              onDeleteField={onDeleteField}
                              onDuplicateField={onDuplicateField}
                              selectedField={selectedField}
                            />
                          ) : (
                            <p className="text-small text-muted">Unknown field type: {field.type}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onDuplicateField(field.id)}
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
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}