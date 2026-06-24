import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Trash2, Copy } from 'lucide-react';
import useFormStore from '../store/formStore';

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
};

export default function FormCanvas({ fields, onSelectField, onDeleteField, onDuplicateField, selectedField, isPreview = false }) {
  const { reorderFields, updateField } = useFormStore();

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    reorderFields(result.source.index, result.destination.index);
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
    return (
      <div className="space-y-6" role="form" aria-label="Form preview">
        {fields.map((field) => {
          const FieldComponent = FIELD_COMPONENTS[field.type];
          return (
            <div key={field.id} className="space-y-2">
              <label 
                htmlFor={field.id}
                className="block text-body font-medium text-base"
              >
                {field.label || 'Untitled field'}
                {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
              </label>
              {FieldComponent ? (
                <FieldComponent field={field} isPreview={isPreview} />
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
                          </div>
                          
                          {FieldComponent ? (
                            <FieldComponent field={field} isPreview={false} />
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