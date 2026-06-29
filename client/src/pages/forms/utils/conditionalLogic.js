export const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals', supportsValue: true },
  { value: 'notEquals', label: 'Does not equal', supportsValue: true },
  { value: 'contains', label: 'Contains', supportsValue: true },
  { value: 'greaterThan', label: 'Greater than', supportsValue: true },
  { value: 'lessThan', label: 'Less than', supportsValue: true },
  { value: 'isEmpty', label: 'Is empty', supportsValue: false },
  { value: 'isNotEmpty', label: 'Is not empty', supportsValue: false },
];

export const DEFAULT_CONDITIONAL_LOGIC = {
  action: 'show',
  operator: 'and',
  conditions: [],
};

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value;
  return String(value);
}

function evaluateCondition(condition, fieldValue) {
  const { operator, value } = condition;
  const normalized = normalizeValue(fieldValue);

  switch (operator) {
    case 'equals':
      if (Array.isArray(normalized)) {
        return normalized.includes(String(value));
      }
      return normalized === String(value);
    case 'notEquals':
      if (Array.isArray(normalized)) {
        return !normalized.includes(String(value));
      }
      return normalized !== String(value);
    case 'contains':
      return String(normalized).toLowerCase().includes(String(value).toLowerCase());
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    case 'isEmpty':
      if (Array.isArray(normalized)) return normalized.length === 0;
      return normalized === '';
    case 'isNotEmpty':
      if (Array.isArray(normalized)) return normalized.length > 0;
      return normalized !== '';
    default:
      return false;
  }
}

export function evaluateConditionalLogic(logic, formData) {
  if (!logic || !logic.conditions || logic.conditions.length === 0) {
    return true;
  }

  const results = logic.conditions.map((condition) =>
    evaluateCondition(condition, formData?.[condition.fieldId])
  );

  const matches = logic.operator === 'or'
    ? results.some(Boolean)
    : results.every(Boolean);

  return logic.action === 'hide' ? !matches : matches;
}

export function hasConditionalLogic(field) {
  return !!field?.conditionalLogic?.conditions?.length;
}
