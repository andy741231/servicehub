import { Tag, Settings, Trash2, GitBranch, Plus, Palette, CheckSquare } from 'lucide-react';
import useFormStore from '../store/formStore';
import { CONDITION_OPERATORS, DEFAULT_CONDITIONAL_LOGIC, hasConditionalLogic } from '../utils/conditionalLogic';
import { DEFAULT_THEME } from '../store/formStore';

export default function PropertiesPanel({ selectedField, onUpdateField }) {
  const { fields, updateField, currentFormId, forms, updateFormTheme } = useFormStore();
  const field = fields.find((f) => f.id === selectedField);
  const currentForm = forms.find((f) => f.id === currentFormId);
  const theme = currentForm?.theme || { ...DEFAULT_THEME };

  if (!field) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6" role="tabpanel" aria-label="Form settings">
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="theme-progress-bar"
                checked={theme.showProgressBar}
                onChange={(e) => updateFormTheme({ showProgressBar: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1"
              />
              <label htmlFor="theme-progress-bar" className="text-body text-base cursor-pointer">
                Show progress bar
              </label>
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

      {/* Advanced Field Settings */}
      {(field.type === 'rating' || field.type === 'file' || field.type === 'signature') && (
        <section>
          <h3 className="text-body font-medium text-base mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Field Settings
          </h3>
          <div className="space-y-4">
            {field.type === 'rating' && (
              <div>
                <label htmlFor="prop-max-stars" className="block text-small font-medium text-base mb-1.5">
                  Maximum Stars
                </label>
                <input
                  id="prop-max-stars"
                  type="number"
                  min={2}
                  max={10}
                  value={field.maxStars || 5}
                  onChange={(e) => handleUpdate({ maxStars: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                />
              </div>
            )}
            {field.type === 'file' && (
              <>
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
              </>
            )}
            {field.type === 'signature' && (
              <div>
                <label htmlFor="prop-signature-type" className="block text-small font-medium text-base mb-1.5">
                  Signature Type
                </label>
                <select
                  id="prop-signature-type"
                  value={field.signatureType || 'draw'}
                  onChange={(e) => handleUpdate({ signatureType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
                >
                  <option value="draw">Draw</option>
                  <option value="type">Type</option>
                </select>
              </div>
            )}
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

      {/* Conditional Logic */}
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
    </div>
  );
}
