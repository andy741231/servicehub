import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Star, PenTool, X } from 'lucide-react';
import { DEFAULT_THEME } from '../store/formStore';
import { evaluateConditionalLogic } from '../utils/conditionalLogic';
import { uploadFile } from '../api/formsApi';

const FIELD_COMPONENTS = {
  text: ({ field, value, onChange, error, theme }) => (
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
  ),
  textarea: ({ field, value, onChange, error, theme }) => (
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
  ),
  number: ({ field, value, onChange, error, theme }) => (
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
  ),
  email: ({ field, value, onChange, error, theme }) => (
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
  ),
  phone: ({ field, value, onChange, error, theme }) => (
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
  ),
  date: ({ field, value, onChange, error, theme }) => (
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
  ),
  select: ({ field, value, onChange, error, theme }) => (
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
};

export default function FormRenderer({ form, onSubmit, preview = false }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

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

  const pages = formFields.reduce((acc, field) => {
    if (field.type === 'pageBreak') {
      acc.push([]);
    } else {
      acc[acc.length - 1] = [...acc[acc.length - 1], field];
    }
    return acc;
  }, [[]]).filter((page) => page.length > 0);

  const allFields = pages.flat();
  const currentPageFields = pages[currentPage] || [];
  const visiblePageFields = currentPageFields.filter((field) =>
    evaluateConditionalLogic(field.conditionalLogic, formData)
  );

  const validatePage = (pageIndex) => {
    const pageFields = pages[pageIndex] || [];
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
          <p className="mb-6" style={{ color: theme.textColor, opacity: 0.8 }}>
            {theme.thankYouMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
              {form.title}
            </h1>
            {form.description && (
              <p style={{ color: theme.textColor, opacity: 0.8 }}>{form.description}</p>
            )}
          </div>

          {/* Progress Bar */}
          {theme.showProgressBar && pages.length > 0 && (
            <div className="mb-6">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${pageProgress * 100}%`, backgroundColor: theme.primaryColor }}
                />
              </div>
              <p className="text-sm mt-2 text-right" style={{ color: theme.textColor, opacity: 0.7 }}>
                Page {currentPage + 1} of {pages.length}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {visiblePageFields.map((field, index) => {
              const FieldComponent = FIELD_COMPONENTS[field.type];
              if (!FieldComponent) return null;

              return (
                <div key={field.id} className="space-y-2">
                  {field.type !== 'checkbox' && (
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
                          {index + 1}
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

                  {errors[field.id] && field.type !== 'checkbox' && (
                    <p id={`${field.id}-error`} className="text-sm text-red-600">
                      {errors[field.id]}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-4">
              {currentPage > 0 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors min-h-[48px]"
                  style={{ '--tw-ring-color': theme.primaryColor }}
                >
                  Previous
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
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
                ) : (
                  preview
                    ? (currentPage === pages.length - 1 ? 'Preview Submit' : 'Preview Next')
                    : (currentPage === pages.length - 1 ? theme.buttonText : 'Next')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
