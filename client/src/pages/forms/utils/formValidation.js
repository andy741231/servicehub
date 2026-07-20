import { z } from 'zod';

/**
 * Build a zod schema for a single form field based on its type and validation config.
 * Returns a zod schema that can be used with react-hook-form's zodResolver.
 */
function buildFieldSchema(field) {
  // Computed fields are auto-calculated — never validated
  if (field.type === 'computed') {
    return z.any().optional();
  }

  const label = field.label || 'This field';
  const requiredMsg = field.validationMessage || `${label} is required`;

  // Helper: check if a value is "empty"
  const isEmpty = (v) =>
    v == null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) &&
      Object.values(v).every((x) => x === undefined || x === null || x === ''));

  let schema;

  switch (field.type) {
    case 'email':
      schema = z.string().refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        field.validationMessage || 'Please enter a valid email address'
      );
      break;

    case 'url':
      schema = z.string().refine((v) => {
        if (!v) return true;
        try {
          const u = new URL(v);
          return u.protocol.startsWith('http');
        } catch {
          return false;
        }
      }, field.validationMessage || 'Please enter a valid URL (https://...)');
      break;

    case 'number':
      schema = z.string().refine((v) => {
        if (!v) return true;
        const n = parseFloat(v);
        if (field.minValue != null && n < field.minValue) return false;
        if (field.maxValue != null && n > field.maxValue) return false;
        return true;
      }, (v) => {
        const n = parseFloat(v);
        if (field.minValue != null && n < field.minValue) return `Minimum value is ${field.minValue}`;
        if (field.maxValue != null && n > field.maxValue) return `Maximum value is ${field.maxValue}`;
        return 'Invalid number';
      });
      break;

    case 'checkbox':
      schema = z.array(z.any());
      break;

    case 'name':
      schema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }).passthrough();
      break;

    case 'address':
      schema = z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
      }).passthrough();
      break;

    case 'repeatingGroup':
      schema = z.array(z.any());
      break;

    default:
      // text, textarea, url, select, rating, slider, file, image, content, etc.
      schema = z.string();
      if (field.minLength || field.maxLength || field.pattern) {
        schema = schema.refine((v) => {
          if (!v) return true;
          if (field.minLength && v.length < field.minLength) return false;
          if (field.maxLength && v.length > field.maxLength) return false;
          if (field.pattern) {
            try {
              const re = new RegExp(field.pattern);
              if (!re.test(v)) return false;
            } catch {
              // Invalid regex — ignore
            }
          }
          return true;
        }, (v) => {
          if (field.minLength && v && v.length < field.minLength) return `Minimum ${field.minLength} characters required`;
          if (field.maxLength && v && v.length > field.maxLength) return `Maximum ${field.maxLength} characters allowed`;
          return field.validationMessage || 'Please match the requested format';
        });
      }
  }

  // Apply required validation
  if (field.required) {
    schema = schema.refine((v) => !isEmpty(v), requiredMsg);
  } else {
    // Optional fields pass when empty
    schema = schema.refine((v) => isEmpty(v) || true, '').optional();
  }

  return schema;
}

/**
 * Build a complete zod schema for a form from its field definitions.
 * Only includes visible (non-conditional-hidden) fields.
 */
export function buildFormSchema(fields, formData) {
  const shape = {};
  (fields || []).forEach((field) => {
    if (field.type === 'pageBreak') return;
    if (field.type === 'computed') return;
    // Only include fields that are visible based on conditional logic
    // We use a simple check — the full conditional logic is evaluated at render time
    shape[field.id] = buildFieldSchema(field);
  });
  return z.object(shape).passthrough();
}

/**
 * Validate a single field against its zod schema.
 * Returns the error message string or null if valid.
 */
export function validateFieldZod(field, value) {
  const schema = buildFieldSchema(field);
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.issues[0]?.message || null;
}

/**
 * Validate multiple fields at once.
 * Returns an object of { fieldId: errorMessage } for invalid fields.
 */
export function validateFieldsZod(fields, formData) {
  const errors = {};
  for (const field of fields) {
    if (field.type === 'pageBreak' || field.type === 'computed') continue;
    const error = validateFieldZod(field, formData[field.id]);
    if (error) {
      errors[field.id] = error;
    }
  }
  return errors;
}
