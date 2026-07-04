// ─── Formula evaluation for computed fields ─────────────────────────────────
// Supports arithmetic expressions with field references using ${fieldLabel} or
// ${fieldId} placeholders. Only numbers, operators (+ - * /), parentheses, and
// whitespace are allowed after substitution — no arbitrary JS.

/**
 * Extract the labels/IDs of fields referenced in a formula.
 * @param {string} formula — e.g. "${Price} * ${Quantity}"
 * @returns {string[]} — ['Price', 'Quantity']
 */
export function getFormulaReferences(formula) {
  if (!formula) return [];
  const matches = String(formula).matchAll(/\$\{([^}]+)\}/g);
  const refs = new Set();
  for (const m of matches) refs.add(m[1].trim());
  return [...refs];
}

/**
 * Resolve a field reference to a numeric value from the form data.
 * Tries matching by label first, then by id.
 */
const resolveReference = (ref, fields, formData) => {
  // By id
  let field = fields.find((f) => f.id === ref);
  // By label (case-insensitive)
  if (!field) {
    const lower = ref.toLowerCase();
    field = fields.find((f) => (f.label || '').toLowerCase() === lower);
  }
  if (!field) return 0;

  const raw = formData[field.id];
  if (raw == null || raw === '') return 0;

  // Handle object-style fields (name, address) — sum numeric parts
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.values(raw).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  }
  // Handle arrays (checkbox selections) — count items
  if (Array.isArray(raw)) return raw.length;

  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
};

/**
 * Evaluate a formula string given the form's fields and current data.
 * Returns { value: number|null, error: string|null }
 */
export function evaluateFormula(formula, fields, formData) {
  if (!formula || !formula.trim()) return { value: null, error: 'Empty formula' };

  // Substitute ${...} placeholders with numeric values
  let substituted = String(formula);
  const refs = getFormulaReferences(formula);
  for (const ref of refs) {
    const value = resolveReference(ref, fields, formData);
    substituted = substituted.replaceAll(`\${${ref}}`, String(value));
  }

  // After substitution, only allow numbers, operators, parens, whitespace, decimal points
  if (!/^[\d\s+\-*/().]+$/.test(substituted)) {
    return { value: null, error: 'Formula contains invalid characters' };
  }

  try {
    // Use Function for math evaluation — input is sanitized to only math chars
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${substituted});`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      return { value: null, error: 'Formula did not produce a number' };
    }
    return { value: result, error: null };
  } catch (e) {
    return { value: null, error: 'Invalid formula expression' };
  }
}

/**
 * Format a computed value for display using the field's displayFormat.
 * If displayFormat contains "{value}", replace it; otherwise just show the number.
 */
export function formatComputedValue(value, displayFormat) {
  if (value == null) return '';
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (!displayFormat) return formatted;
  return displayFormat.replaceAll('{value}', formatted);
}

/**
 * Get a human-friendly preview of the formula for display in the builder.
 * e.g. "${Price} * ${Quantity}" → "$0.00 (preview)"
 */
export function getFormulaPreview(formula, displayFormat) {
  if (!formula) return 'No formula set';
  // Show the raw formula with placeholders resolved to 0 for preview
  const preview = formula.replaceAll(/\$\{([^}]+)\}/g, '0');
  try {
    if (!/^[\d\s+\-*/().]+$/.test(preview)) return formula;
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${preview});`)();
    const val = Number.isInteger(result) ? result : result.toFixed(2);
    return formatComputedValue(val, displayFormat) + ' (preview)';
  } catch {
    return formula;
  }
}
