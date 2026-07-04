import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Star, PenTool, X, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';
import { DEFAULT_THEME } from '../store/formStore';
import { evaluateConditionalLogic } from '../utils/conditionalLogic';
import { uploadFile } from '../api/formsApi';
import { evaluateSchedule, nextTransition, formatDuration, formatDayTime } from '../utils/schedule';
import { evaluateFormula, formatComputedValue } from '../utils/formula';

// Shared inline error message rendered below a field input
const FieldError = ({ fieldId, error }) =>
  error ? (
    <p id={`${fieldId}-error`} role="alert" className="flex items-center gap-1 text-sm text-red-600 mt-1.5">
      <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  ) : null;

// Sanitize Quill HTML output for safe rendering in the public form.
const sanitizeHtml = (html) =>
  DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });

const FIELD_COMPONENTS = {
  text: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="text"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  textarea: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <textarea
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label}
        rows={4}
        maxLength={field.maxLength || undefined}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      {field.maxLength && (
        <p className="text-xs text-gray-400 text-right mt-1">
          {(value || '').length}/{field.maxLength}
        </p>
      )}
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  number: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="number"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
        min={field.minValue}
        max={field.maxValue}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  email: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="email"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  phone: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="tel"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  date: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="date"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  select: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <select
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      >
        <option value="" disabled hidden>Select an option</option>
        {field.options?.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  checkbox: ({ field, value, onChange, error, theme }) => (
    <fieldset className={`space-y-3 ${error ? 'border border-red-500 rounded-lg p-4' : ''}`} aria-label={field.label}>
      <legend className="text-sm font-medium text-gray-700">{field.label}</legend>
      {field.options?.map((option, index) => (
        <label key={index} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            id={`${field.id}-${index}`}
            checked={Array.isArray(value) ? value.includes(option) : false}
            onChange={(e) => {
              const currentValues = Array.isArray(value) ? value : [];
              if (e.target.checked) {
                onChange([...currentValues, option]);
              } else {
                onChange(currentValues.filter(v => v !== option));
              }
            }}
            className={`w-5 h-5 rounded border-gray-300 focus:ring-2 ${
              error ? 'text-red-600 focus:ring-red-500' : ''
            }`}
            style={error ? undefined : { '--tw-ring-color': theme?.primaryColor, color: theme?.primaryColor }}
            aria-label={option}
          />
          <span className="text-gray-700">{option}</span>
        </label>
      ))}
      {error && (
        <p id={`${field.id}-error`} className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </fieldset>
  ),
  rating: ({ field, value, onChange, error, theme }) => {
    const maxStars = field.maxStars || 5;
    const currentRating = Number(value) || 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1" role="radiogroup" aria-label={field.label}>
          {Array.from({ length: maxStars }).map((_, index) => {
            const starValue = index + 1;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onChange(starValue)}
                className="p-1 focus:outline-none focus:ring-2 rounded transition-colors"
                style={{ '--tw-ring-color': theme?.primaryColor }}
                role="radio"
                aria-checked={currentRating === starValue}
                aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
              >
                <Star
                  className="h-8 w-8 transition-colors"
                  fill={currentRating >= starValue ? theme?.primaryColor : 'transparent'}
                  stroke={currentRating >= starValue ? theme?.primaryColor : '#9ca3af'}
                />
              </button>
            );
          })}
        </div>
        {error && (
          <p id={`${field.id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
  file: ({ field, value, onChange, error, theme }) => {
    const [isUploading, setIsUploading] = useState(false);
    // value can be a string (legacy: just the URL) or an object { url, name, size }
    const fileObj = value && typeof value === 'object' ? value : null;
    const fileUrl = typeof value === 'string' ? value : fileObj?.url;
    const fileName = fileObj?.name || (fileUrl ? fileUrl.split('/').pop() : null);

    const handleFileChange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        onChange(null);
        return;
      }
      if (field.maxSize && file.size > field.maxSize * 1024 * 1024) {
        onChange(null);
        alert(`File is too large. Maximum size is ${field.maxSize}MB.`);
        return;
      }

      setIsUploading(true);
      try {
        const result = await uploadFile(file);
        onChange({ url: result.url, name: file.name, size: file.size });
      } catch (err) {
        console.error('File upload failed:', err);
        alert('Failed to upload file. Please try again.');
        onChange(null);
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-lg ${error ? 'border-red-500' : 'border-gray-300'}`}>
          <input
            type="file"
            id={field.id}
            accept={field.accept || undefined}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            aria-label={field.label || 'File upload'}
            aria-invalid={!!error}
            aria-describedby={error ? `${field.id}-error` : undefined}
          />
          {fileName ? (
            <>
              <span className="flex-1 text-sm text-gray-700 truncate" title={fileName}>
                {fileName}
              </span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                aria-label="Remove uploaded file"
              >
                Remove
              </button>
              <label
                htmlFor={field.id}
                className="px-3 py-1.5 text-sm rounded-lg cursor-pointer border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ '--tw-ring-color': theme?.primaryColor }}
              >
                Replace
              </label>
            </>
          ) : (
            <>
              <label
                htmlFor={field.id}
                className={`px-4 py-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 border border-gray-300 text-gray-600 hover:bg-gray-50 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ '--tw-ring-color': theme?.primaryColor }}
              >
                {isUploading ? 'Uploading…' : 'Choose file'}
              </label>
              <span className="text-sm text-gray-400 truncate">
                No file selected
              </span>
            </>
          )}
        </div>
        {field.maxSize && (
          <p className="text-sm text-gray-500">Max file size: {field.maxSize}MB</p>
        )}
        {error && (
          <p id={`${field.id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
  signature: ({ field, value, onChange, error, theme }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef(null);
    const signatureType = field.signatureType || 'draw';

    const startDrawing = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
      onChange(canvas.toDataURL());
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange('');
    };

    return (
      <div className="space-y-2">
        {signatureType === 'draw' ? (
          <>
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className={`w-full border rounded-lg bg-white cursor-crosshair ${error ? 'border-red-500' : 'border-gray-300'}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              aria-label={field.label || 'Signature pad'}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ '--tw-ring-color': theme?.primaryColor }}
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </>
        ) : (
          <input
            type="text"
            id={field.id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your signature"
            className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
            aria-label={field.label || 'Typed signature'}
          />
        )}
        {error && (
          <p id={`${field.id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
  content: ({ field, theme }) => {
    const bs = field.blockStyle || {};
    const inlineStyle = {
      color:         bs.color   || theme.textColor,
      fontSize:      bs.fontSize ? `${bs.fontSize}px` : undefined,
      textAlign:     bs.textAlign || undefined,
      paddingTop:    bs.paddingTop    != null ? `${bs.paddingTop}px`    : undefined,
      paddingBottom: bs.paddingBottom != null ? `${bs.paddingBottom}px` : undefined,
      paddingLeft:   bs.paddingLeft   != null ? `${bs.paddingLeft}px`   : undefined,
      paddingRight:  bs.paddingRight  != null ? `${bs.paddingRight}px`  : undefined,
    };
    return (
      <div
        className="ql-snow"
        style={inlineStyle}
      >
        <div
          className="ql-editor !p-0 !min-h-0"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(field.content) }}
        />
      </div>
    );
  },
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
        {field.imageUrl && (
          <img src={field.imageUrl} alt={field.label || 'Image'} style={{ maxWidth: bs.width ? `${bs.width}px` : '100%', height: 'auto', display: 'inline-block', borderRadius: '8px' }} />
        )}
      </div>
    );
  },
  url: ({ field, value, onChange, error, theme }) => (
    <div className="space-y-0">
      <input
        type="url"
        id={field.id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || field.label || 'https://example.com'}
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        }`}
        style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
        aria-label={field.label}
        aria-required={field.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
      <FieldError fieldId={field.id} error={error} />
    </div>
  ),
  slider: ({ field, value, onChange, error, theme }) => {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step || 1;
    const current = value !== undefined && value !== '' ? Number(value) : min;
    return (
      <div className="space-y-2">
        <input
          type="range"
          id={field.id}
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: theme?.primaryColor }}
          aria-label={field.label}
          aria-required={field.required}
          aria-invalid={!!error}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>{min}</span>
          <span className="font-medium text-gray-700">{current}</span>
          <span>{max}</span>
        </div>
        <FieldError fieldId={field.id} error={error} />
      </div>
    );
  },
  name: ({ field, value, onChange, error, theme }) => {
    const v = value || {};
    const setPart = (part, val) => onChange({ ...v, [part]: val });
    return (
      <div className="space-y-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={v.first || ''}
            onChange={(e) => setPart('first', e.target.value)}
            placeholder="First name"
            className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
            aria-label={`${field.label} first name`}
            aria-required={field.required}
          />
          <input
            type="text"
            value={v.last || ''}
            onChange={(e) => setPart('last', e.target.value)}
            placeholder="Last name"
            className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
            }`}
            style={error ? undefined : { '--tw-ring-color': theme?.primaryColor }}
            aria-label={`${field.label} last name`}
            aria-required={field.required}
          />
        </div>
        <FieldError fieldId={field.id} error={error} />
      </div>
    );
  },
  address: ({ field, value, onChange, error, theme }) => {
    const v = value || {};
    const setPart = (part, val) => onChange({ ...v, [part]: val });
    const inputCls = `w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
      error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
    }`;
    const ringStyle = error ? undefined : { '--tw-ring-color': theme?.primaryColor };
    return (
      <div className="space-y-2">
        <input type="text" value={v.street || ''} onChange={(e) => setPart('street', e.target.value)} placeholder="Street address" className={inputCls} style={ringStyle} aria-label={`${field.label} street`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" value={v.city || ''} onChange={(e) => setPart('city', e.target.value)} placeholder="City" className={inputCls} style={ringStyle} aria-label={`${field.label} city`} />
          <input type="text" value={v.state || ''} onChange={(e) => setPart('state', e.target.value)} placeholder="State / Province" className={inputCls} style={ringStyle} aria-label={`${field.label} state`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" value={v.zip || ''} onChange={(e) => setPart('zip', e.target.value)} placeholder="ZIP / Postal code" className={inputCls} style={ringStyle} aria-label={`${field.label} zip`} />
          <input type="text" value={v.country || ''} onChange={(e) => setPart('country', e.target.value)} placeholder="Country" className={inputCls} style={ringStyle} aria-label={`${field.label} country`} />
        </div>
        <FieldError fieldId={field.id} error={error} />
      </div>
    );
  },
  computed: ({ field, formData, allFields, theme }) => {
    const { value, error } = evaluateFormula(field.formula, allFields, formData);
    const display = formatComputedValue(value, field.displayFormat);
    return (
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-2xl font-bold" style={{ color: theme?.primaryColor }}>
          {display || '—'}
        </div>
        {error && field.formula && (
          <div className="text-xs text-gray-400 mt-1">{error}</div>
        )}
      </div>
    );
  },
  repeatingGroup: ({ field, value, onChange, error, theme, allFields, renderFields }) => {
    const instances = Array.isArray(value) ? value : [];
    const min = field.minInstances || 1;
    const max = field.maxInstances ? parseInt(field.maxInstances) : Infinity;
    // Ensure at least min instances
    const effectiveInstances = instances.length < min
      ? [...instances, ...Array.from({ length: min - instances.length }, () => ({}))]
      : instances;

    const updateInstance = (index, data) => {
      const next = [...effectiveInstances];
      next[index] = data;
      onChange(next);
    };
    const addInstance = () => {
      if (effectiveInstances.length < max) onChange([...effectiveInstances, {}]);
    };
    const removeInstance = (index) => {
      if (effectiveInstances.length <= min) return;
      onChange(effectiveInstances.filter((_, i) => i !== index));
    };

    // Find child fields that belong to this repeating group.
    // Prefer the explicit `groupId` linkage (set by the builder); fall back to
    // rowId matching only for legacy forms that pre-date the groupId property.
    const childFields = allFields.filter((f) =>
      f.id !== field.id &&
      f.type !== 'pageBreak' &&
      (f.groupId ? f.groupId === field.id : f.rowId === field.rowId)
    );

    return (
      <div className="space-y-4">
        {effectiveInstances.map((instance, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Entry {index + 1}</span>
              {effectiveInstances.length > min && (
                <button
                  type="button"
                  onClick={() => removeInstance(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            {childFields.map((childField) => {
              const ChildComponent = FIELD_COMPONENTS[childField.type];
              if (!ChildComponent) return null;
              return (
                <div key={childField.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {childField.label}
                    {childField.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <ChildComponent
                    field={childField}
                    value={instance[childField.id]}
                    onChange={(val) => updateInstance(index, { ...instance, [childField.id]: val })}
                    error={null}
                    theme={theme}
                    allFields={allFields}
                    formData={instance}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {effectiveInstances.length < max && (
          <button
            type="button"
            onClick={addInstance}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            style={{ '--tw-ring-color': theme?.primaryColor }}
          >
            + {field.addButtonLabel || 'Add another'}
          </button>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
};

// ── Closed screen ───────────────────────────────────────────────────────────
// Shown when the form's access schedule says "closed right now".
// Displays the admin's closed message plus, when computable, the next
// open time and a live countdown that refreshes every second.
function ClosedScreen({ form, schedule, theme }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const transition = schedule?.enabled ? nextTransition(schedule) : null;
  const opening = transition?.opening ? transition : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <Lock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textColor }}>
          {form.title}
        </h1>
        <p className="text-gray-600 leading-relaxed">
          {schedule?.closedMessage || 'This form is currently closed. Please check back later.'}
        </p>
        {opening && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Opens
            </p>
            <p className="text-lg font-semibold" style={{ color: theme.primaryColor }}>
              {formatDayTime(opening.at)}
            </p>
            <p className="text-sm text-gray-500 mt-1 tabular-nums">
              {formatDuration(opening.at.getTime() - Date.now())}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormRenderer({ form, onSubmit, preview = false }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Schedule check (re-evaluates whenever form changes; skipped in preview mode)
  const scheduleStatus = preview ? { open: true, closedMessage: null } : evaluateSchedule(form?.accessSchedule);

  useEffect(() => {
    const initialData = {};
    (form.fields || []).forEach(field => {
      if (field.type === 'computed') {
        initialData[field.id] = '';
      } else if (field.type === 'repeatingGroup') {
        initialData[field.id] = [];
      } else if (field.type === 'checkbox') {
        initialData[field.id] = [];
      } else {
        initialData[field.id] = '';
      }
    });
    setFormData(initialData);
    setErrors({});
    setIsSubmitted(false);
    setCurrentPage(0);
  }, [form]);

  // Auto-compute computed fields whenever form data changes
  useEffect(() => {
    const computedFields = (form.fields || []).filter((f) => f.type === 'computed' && f.formula);
    if (computedFields.length === 0) return;
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };
      computedFields.forEach((field) => {
        const { value } = evaluateFormula(field.formula, form.fields, prev);
        const display = formatComputedValue(value, field.displayFormat);
        if (next[field.id] !== display) {
          next[field.id] = display;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [formData, form.fields]);

  const validateField = (field, value) => {
    // Computed fields are auto-calculated — never validate them
    if (field.type === 'computed') return null;
    const label = field.label || 'This field';
    const requiredMsg = field.validationMessage || `${label} is required`;

    // Determine "emptiness" including object-style fields (name, address)
    const isEmptyObject = (v) => v && typeof v === 'object' && !Array.isArray(v) &&
      Object.values(v).every((x) => x === undefined || x === null || x === '');
    const isEmpty = !value || (Array.isArray(value) && value.length === 0) || isEmptyObject(value);

    if (field.required && isEmpty) {
      return requiredMsg;
    }
    if (isEmpty) return null;

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return field.validationMessage || 'Please enter a valid email address';
      }
    }

    if (field.type === 'url' && value) {
      try {
        const u = new URL(value);
        if (!u.protocol.startsWith('http')) throw new Error();
      } catch {
        return field.validationMessage || 'Please enter a valid URL (https://...)';
      }
    }

    if (field.type === 'number' && value) {
      const numValue = parseFloat(value);
      if (field.minValue != null && numValue < field.minValue) {
        return `Minimum value is ${field.minValue}`;
      }
      if (field.maxValue != null && numValue > field.maxValue) {
        return `Maximum value is ${field.maxValue}`;
      }
    }

    if ((field.type === 'text' || field.type === 'textarea' || field.type === 'url') && value) {
      if (field.minLength && value.length < field.minLength) {
        return `Minimum ${field.minLength} characters required`;
      }
      if (field.maxLength && value.length > field.maxLength) {
        return `Maximum ${field.maxLength} characters allowed`;
      }
      if (field.pattern) {
        try {
          const re = new RegExp(field.pattern);
          if (!re.test(value)) {
            return field.validationMessage || 'Please match the requested format';
          }
        } catch {
          // Invalid regex in config — ignore rather than crash
        }
      }
    }

    return null;
  };

  // Move focus to the first invalid field so keyboard/screen-reader users can
  // find the error without hunting. Called after a failed validatePage/validateForm.
  const focusFirstError = (errorsObj) => {
    const firstErrorFieldId = visiblePageFields.find((f) => errorsObj[f.id])?.id;
    if (!firstErrorFieldId) return;
    setTimeout(() => {
      const el = document.getElementById(firstErrorFieldId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 0);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    const visibleFields = allFields.filter((field) =>
      evaluateConditionalLogic(field.conditionalLogic, formData)
    );

    visibleFields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    if (!isValid) focusFirstError(newErrors);
    return isValid;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validatePage(currentPage)) {
      setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePage(currentPage)) {
      return;
    }

    if (currentPage < pages.length - 1) {
      setCurrentPage((prev) => prev + 1);
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (preview) {
      alert('Preview validation passed. This is a preview — no submission was saved.');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const visibleFields = allFields.filter((field) =>
        evaluateConditionalLogic(field.conditionalLogic, formData)
      );
      const submissionData = {};
      visibleFields.forEach(field => {
        const key = field.label || field.id;
        submissionData[key] = formData[field.id];
      });

      if (onSubmit) {
        await onSubmit(submissionData);
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  const theme = { ...DEFAULT_THEME, ...form.theme };
  const formFields = form.fields || [];

  // Each row is one "page". Rows whose conditional logic is false are skipped.
  const allRows = (form.rows || []).filter((row) =>
    evaluateConditionalLogic(row.conditionalLogic, formData)
  );
  // In conversational mode each field is its own page (one question per screen).
  const conversational = theme.layoutMode === 'conversational';
  // pages: array of { row, fields }
  const pages = (conversational
    ? allRows.flatMap((row) =>
        formFields
          .filter((f) => f.rowId === row.id && f.type !== 'pageBreak')
          .map((f) => ({ row, fields: [f] }))
      )
    : allRows.map((row) => ({
        row,
        fields: formFields.filter((f) => f.rowId === row.id && f.type !== 'pageBreak'),
      }))
  ).filter((p) => p.fields.length > 0);

  const allFields = formFields.filter((f) => f.type !== 'pageBreak');
  const currentPage_obj = pages[currentPage];
  const currentRow = currentPage_obj?.row;
  const currentPageFields = currentPage_obj?.fields || [];
  const visiblePageFields = currentPageFields.filter((field) =>
    evaluateConditionalLogic(field.conditionalLogic, formData) &&
    // Don't render repeating-group children at the top level — they render
    // inside their parent group instance. (groupId set by the builder.)
    !field.groupId
  );

  const validatePage = (pageIndex) => {
    const pageFields = pages[pageIndex]?.fields || [];
    const visibleFields = pageFields.filter((field) =>
      evaluateConditionalLogic(field.conditionalLogic, formData)
    );
    const newErrors = {};
    let isValid = true;

    visibleFields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
    if (!isValid) focusFirstError(newErrors);
    return isValid;
  };

  const pageProgress = pages.length > 0 ? (currentPage + 1) / pages.length : 1;

  // Show "form closed" screen when schedule is active and current time is outside all open windows
  if (!scheduleStatus.open) {
    return <ClosedScreen form={form} schedule={form?.accessSchedule} theme={theme} />;
  }

  if (!preview && isSubmitted) {
    const confirmationId = `SH-${Date.now().toString(36).toUpperCase()}`;
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
      >
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textColor }}>
            {theme.thankYouTitle}
          </h1>
          <div
            className="mb-4 ql-editor !p-0 !min-h-0"
            style={{ color: theme.textColor }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(theme.thankYouMessage) }}
          />
          <p className="text-sm text-gray-500 mb-6">
            Confirmation ID: <span className="font-mono font-medium text-gray-700">{confirmationId}</span>
          </p>
          <button
            type="button"
            onClick={() => { setFormData({}); setErrors({}); setCurrentPage(0); setIsSubmitted(false); }}
            className="px-5 py-2.5 rounded-lg font-medium transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor, '--tw-ring-color': theme.primaryColor }}
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  const layoutGrid = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  const hasMultiColumnRow = (form.rows || []).some((r) => r.columns && r.columns !== '1');
  const layoutMaxWidth = hasMultiColumnRow ? 'max-w-6xl' : 'max-w-2xl';
  const isLastPage = currentPage === pages.length - 1;
  const gridClass = layoutGrid[currentRow?.columns] || 'grid-cols-1';

  return (
    <div
      id="main-content"
      className="min-h-screen py-12 px-4 sm:py-12"
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      {/* Form title & description — sits above the card, full-width within the outer padding */}
      <div className={`${layoutMaxWidth} mx-auto mb-6`}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
          {form.title}
        </h1>
        {form.description && (
          <p className="text-base" style={{ color: theme.textColor, opacity: 0.8 }}>{form.description}</p>
        )}
      </div>

      <div className={`${layoutMaxWidth} mx-auto`}>
        <div className="bg-white rounded-xl shadow-lg p-8">

          {/* (Form title moved above card) */}
          {/* Progress indicator — style controlled by theme.progressBarStyle */}
          {pages.length > 1 && (() => {
            const style = theme.progressBarStyle || (theme.showProgressBar ? 'bar' : 'none');
            if (style === 'none') return null;

            return (
              <div className="mb-8">
                {/* Step circles (only for 'steps' style) */}
                {style === 'steps' && (
                  <div className="flex items-center mb-3">
                    {pages.map(({ row }, index) => {
                      const isCompleted = index < currentPage;
                      const isCurrent = index === currentPage;
                      return (
                        <div key={row.id} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300 ${
                                isCompleted
                                  ? 'border-transparent text-white'
                                  : isCurrent
                                  ? 'border-transparent text-white shadow-md'
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}
                              style={
                                isCompleted || isCurrent
                                  ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }
                                  : {}
                              }
                              aria-label={`Step ${index + 1}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                            >
                              {isCompleted ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span className="text-xs text-gray-500 text-center max-w-[80px] sm:max-w-[120px] truncate" title={row.label || `Section ${index + 1}`}>
                              {row.label || `Section ${index + 1}`}
                            </span>
                          </div>
                          {index < pages.length - 1 && (
                            <div className="flex-1 mx-1 h-0.5 rounded-full overflow-hidden bg-gray-200 self-start mt-4">
                              <div
                                className="h-full transition-all duration-500"
                                style={{ width: index < currentPage ? '100%' : '0%', backgroundColor: theme.primaryColor }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Thin bar + percentage (only for 'bar' style) */}
                {style === 'bar' && <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pageProgress * 100}%`, backgroundColor: theme.primaryColor }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums flex-shrink-0" style={{ color: theme.textColor, opacity: 0.6 }}>
                    {Math.round(pageProgress * 100)}%
                  </span>
                </div>}
              </div>
            );
          })()}

          {/* Section heading (shown on the page) */}
          {currentRow && (
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
                {currentRow.label || `Section ${currentPage + 1}`}
              </h2>
              {currentRow.description && (
                <p className="text-sm mt-1" style={{ color: theme.textColor, opacity: 0.7 }}>
                  {currentRow.description}
                </p>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div
              className={`grid ${gridClass} gap-6 mb-6`}
              style={currentRow?.backgroundColor ? { backgroundColor: currentRow.backgroundColor, borderRadius: '0.75rem', padding: '1.25rem' } : {}}
            >
              {visiblePageFields.map((field) => {
                const FieldComponent = FIELD_COMPONENTS[field.type];
                if (!FieldComponent) return null;

                const isFullWidth = field.type === 'content';
                const questionNumber = visiblePageFields.findIndex((f) => f.id === field.id) + 1;

                return (
                  <div key={field.id} className={`space-y-2${isFullWidth ? ' col-span-full' : ''}`}>
                    {field.type !== 'checkbox' && field.type !== 'content' && (
                      <label
                        htmlFor={field.id}
                        className="block text-sm font-medium"
                        style={{ color: theme.textColor }}
                      >
                        {theme.showQuestionNumbers && (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-2"
                            style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor }}
                          >
                            {questionNumber}
                          </span>
                        )}
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}

                    <FieldComponent
                      field={field}
                      value={formData[field.id]}
                      onChange={(value) => handleFieldChange(field.id, value)}
                      error={errors[field.id]}
                      theme={theme}
                      allFields={allFields}
                      formData={formData}
                    />

                    {field.helpText && (
                      <p className="text-sm" style={{ color: theme.textColor, opacity: 0.7 }}>
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-h-[48px]"
                  style={{ '--tw-ring-color': theme.primaryColor }}
                >
                  ← Back
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px] font-medium"
                style={{
                  backgroundColor: theme.buttonColor,
                  color: theme.buttonTextColor,
                  '--tw-ring-color': theme.primaryColor,
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : preview
                  ? (isLastPage ? 'Preview Submit' : 'Next →')
                  : (isLastPage ? theme.buttonText : 'Next →')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
