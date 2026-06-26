import { Tag, Settings, Trash2 } from 'lucide-react';
import useFormStore from '../store/formStore';

export default function PropertiesPanel({ selectedField, onUpdateField }) {
  const { fields, updateField } = useFormStore();
  const field = fields.find((f) => f.id === selectedField);

  if (!field) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-12 w-12 text-subtle mx-auto mb-3" aria-hidden="true" />
          <p className="text-body text-muted">Select a field to edit its properties</p>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates) => {
    updateField(field.id, updates);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" role="tabpanel" aria-label="Field properties">
      {/* Basic Settings */}
      <section>
        <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" aria-hidden="true" />
          Basic Settings
        </h3>
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

      {/* Grid Layout Settings */}
      {field.type === 'grid' && (
        <section>
          <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Grid Layout
          </h3>
          <div>
            <label htmlFor="prop-columns" className="block text-small font-medium text-base mb-1.5">
              Number of Columns
            </label>
            <select
              id="prop-columns"
              value={field.columnCount || 2}
              onChange={(e) => {
                const newColumnCount = parseInt(e.target.value);
                const newColumns = Array(newColumnCount).fill([]);
                handleUpdate({ columnCount: newColumnCount, columns: newColumns });
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
            </select>
          </div>
        </section>
      )}

      {/* Validation */}
      <section>
        <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Validation
        </h3>
        <div className="space-y-4">
          {field.type === 'text' || field.type === 'textarea' ? (
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
          ) : null}

          {field.type === 'number' ? (
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
          ) : null}
        </div>
      </section>
    </div>
  );
}