import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Star, PenTool, X, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';
import { DEFAULT_THEME } from '../store/formStore';
import { evaluateConditionalLogic } from '../utils/conditionalLogic';
import { uploadFile } from '../api/formsApi';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Evaluates whether the form is currently accessible based on its accessSchedule.
 *
 * Data model:
 *   schedule.enabled        — master switch; false → always open
 *   schedule.dateRange      — { enabled, startDate, endDate }
 *   schedule.weeklyHours    — { enabled, slots: [{ days[], startTime, endTime }] }
 *   schedule.closedMessage  — shown when closed
 *
 * AND logic between constraints; OR logic across weekly slots.
 * "Date window Jun 17–18 AND weekly slots [Mon–Wed 9–12, Thu–Fri 14–17]" means:
 *   open only during Jun 17–18, and only when a slot matches the current day/time.
 */
function evaluateSchedule(accessSchedule) {
  if (!accessSchedule?.enabled) return { open: true, closedMessage: null };

  const { dateRange, weeklyHours, closedMessage } = accessSchedule;
  const closed = { open: false, closedMessage: closedMessage || 'This form is currently closed. Please check back later.' };
  const hasAnyConstraint = dateRange?.enabled || weeklyHours?.enabled;
  if (!hasAnyConstraint) return { open: true, closedMessage: null };

  const now = new Date();
  const currentDay = DAY_NAMES[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;
  const currentDate = now.toISOString().slice(0, 10);

  // Date window — must be satisfied if enabled
  if (dateRange?.enabled) {
    const start = dateRange.startDate || '';
    const end = dateRange.endDate || '';
    if (currentDate < start || currentDate > end) return closed;
  }

  // Weekly hours — at least one slot must match (OR across slots)
  if (weeklyHours?.enabled) {
    const slots = weeklyHours.slots || [];
    const anySlotOpen = slots.some((slot) => {
      const days = slot.days || [];
      const start = slot.startTime || '00:00';
      const end = slot.endTime || '23:59';
      return days.includes(currentDay) && currentTime >= start && currentTime < end;
    });
    if (!anySlotOpen) return closed;
  }

  return { open: true, closedMessage: null };
}

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
        className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
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
        <option value="">Select an option</option>
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
    const fileName = value || null;

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
        onChange(result.url);
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
          <label
            htmlFor={field.id}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ backgroundColor: theme?.primaryColor, color: theme?.buttonTextColor, '--tw-ring-color': theme?.primaryColor }}
          >
            {isUploading ? 'Uploading...' : 'Choose file'}
          </label>
          <span className="text-sm text-gray-600 truncate">
            {fileName || 'No file selected'}
          </span>
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
};

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
      initialData[field.id] = field.type === 'checkbox' ? [] : '';
    });
    setFormData(initialData);
    setErrors({});
    setIsSubmitted(false);
    setCurrentPage(0);
  }, [form]);

  const validateField = (field, value) => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label || 'This field'} is required`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'number' && value) {
      const numValue = parseFloat(value);
      if (field.minValue && numValue < field.minValue) {
        return `Minimum value is ${field.minValue}`;
      }
      if (field.maxValue && numValue > field.maxValue) {
        return `Maximum value is ${field.maxValue}`;
      }
    }

    if ((field.type === 'text' || field.type === 'textarea') && value) {
      if (field.minLength && value.length < field.minLength) {
        return `Minimum ${field.minLength} characters required`;
      }
      if (field.maxLength && value.length > field.maxLength) {
        return `Maximum ${field.maxLength} characters allowed`;
      }
    }

    return null;
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
  // pages: array of { row, fields }
  const pages = allRows.map((row) => ({
    row,
    fields: formFields.filter((f) => f.rowId === row.id && f.type !== 'pageBreak'),
  })).filter((p) => p.fields.length > 0);

  const allFields = formFields.filter((f) => f.type !== 'pageBreak');
  const currentPage_obj = pages[currentPage];
  const currentRow = currentPage_obj?.row;
  const currentPageFields = currentPage_obj?.fields || [];
  const visiblePageFields = currentPageFields.filter((field) =>
    evaluateConditionalLogic(field.conditionalLogic, formData)
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
    return isValid;
  };

  const pageProgress = pages.length > 0 ? (currentPage + 1) / pages.length : 1;

  // Show "form closed" screen when schedule is active and current time is outside all open windows
  if (!scheduleStatus.open) {
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
            {scheduleStatus.closedMessage}
          </p>
        </div>
      </div>
    );
  }

  if (!preview && isSubmitted) {
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
            className="mb-6 ql-editor !p-0 !min-h-0"
            style={{ color: theme.textColor, opacity: 0.8 }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(theme.thankYouMessage) }}
          />
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
      className="min-h-screen py-12 px-4"
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
                            <span className="text-xs text-gray-500 text-center max-w-[64px] truncate" title={row.label || `Section ${index + 1}`}>
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
