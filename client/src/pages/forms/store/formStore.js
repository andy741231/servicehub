import { create } from 'zustand';
import {
  fetchForms,
  fetchForm as fetchFormFromApi,
  createForm,
  updateForm as updateFormApi,
  deleteForm as deleteFormApi,
  submitForm,
  fetchSubmissions,
  fetchVersions as fetchVersionsApi,
  restoreVersion as restoreVersionApi,
} from '../api/formsApi';
import { generateSlug, isDuplicateName } from '../utils/slug';

const STORAGE_KEY = 'form-store';

const loadFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load form store:', e);
    return null;
  }
};

const saveToStorage = (forms, submissions) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ forms, submissions }));
  } catch (e) {
    console.error('Failed to save form store:', e);
  }
};

export const DEFAULT_THEME = {
  primaryColor: '#2563eb',
  backgroundColor: '#f9fafb',
  textColor: '#111827',
  buttonColor: '#2563eb',
  buttonTextColor: '#ffffff',
  fontFamily: 'sans-serif',
  showProgressBar: false,          // kept for backward-compat reads
  progressBarStyle: 'none',        // 'none' | 'bar' | 'steps'
  showQuestionNumbers: false,
  buttonText: 'Submit Form',
  thankYouTitle: 'Thank You!',
  thankYouMessage: 'Your form has been submitted successfully.',
  redirectUrl: '',
  layout: '1', // '1' | '2' | '3' columns
};

const makeDefaultRow = (columns = '1') => ({
  id: `row-${Date.now()}`,
  columns,
});

const DEFAULT_FORMS = [
  {
    id: 'form-1',
    title: 'Contact Form',
    description: 'Basic contact information collection',
    rows: [{ id: 'row-1', columns: '1' }],
    fields: [
      { id: 'field-1', rowId: 'row-1', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: 'field-2', rowId: 'row-1', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
      { id: 'field-3', rowId: 'row-1', type: 'textarea', label: 'Message', placeholder: 'Your message', required: true },
    ],
    theme: { ...DEFAULT_THEME },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'form-2',
    title: 'Survey Form',
    description: 'Customer satisfaction survey',
    rows: [{ id: 'row-2', columns: '1' }],
    fields: [
      { id: 'field-4', rowId: 'row-2', type: 'text', label: 'Company Name', placeholder: 'Company name', required: true },
      { id: 'field-5', rowId: 'row-2', type: 'select', label: 'Industry', placeholder: 'Select industry', required: true, options: ['Technology', 'Healthcare', 'Finance', 'Other'] },
      { id: 'field-6', rowId: 'row-2', type: 'number', label: 'Employees', placeholder: 'Number of employees', required: false },
    ],
    theme: { ...DEFAULT_THEME },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const normalizeForm = (backendForm) => {
  const schema = backendForm.schema || {};
  const theme = schema.theme || { ...DEFAULT_THEME };
  let fields = schema.fields || [];
  let rows = schema.rows || [];

  // Backward compatibility: legacy forms without rows get a single row
  if (!rows.length && fields.length) {
    const rowId = `row-${Date.now()}`;
    rows = [{ id: rowId, columns: theme.layout || '1' }];
    fields = fields.map((f) => ({ ...f, rowId }));
  }

  return {
    id: backendForm.id,
    title: backendForm.title || schema.title || 'Untitled Form',
    slug: schema.slug || generateSlug(backendForm.title || schema.title || 'Untitled Form'),
    description: schema.description || '',
    rows,
    fields,
    theme,
    // Normalise schedule to the AND-based + slots model
    accessSchedule: (() => {
      const s = schema.accessSchedule;
      if (!s) return null;
      // Legacy v1: top-level rules[] array — discard
      if (Array.isArray(s.rules)) return null;
      // Migrate legacy v2 weeklyHours that had days/startTime/endTime directly (no slots[])
      const wh = s.weeklyHours;
      if (wh && !Array.isArray(wh.slots) && (wh.days || wh.startTime)) {
        return {
          ...s,
          weeklyHours: {
            enabled: wh.enabled ?? false,
            slots: [{
              id: `slot-migrated`,
              days: wh.days || [],
              startTime: wh.startTime || '09:00',
              endTime: wh.endTime || '17:00',
            }],
          },
        };
      }
      return s;
    })(),
    createdAt: backendForm.createdAt,
    updatedAt: backendForm.updatedAt,
  };
};

const denormalizeForm = (clientForm) => {
  const { id, title: clientTitle, schema: nestedSchema, createdAt, updatedAt, ...rest } = clientForm;
  const result = {
    title: clientTitle,
    schema: {
      ...rest,
      slug: clientForm.slug,
      description: clientForm.description,
      fields: clientForm.fields,
      theme: clientForm.theme,
    },
  };
  console.log('[denormalizeForm] Input:', clientForm);
  console.log('[denormalizeForm] Output:', result);
  return result;
};

const normalizeSubmission = (backendSubmission) => ({
  id: backendSubmission.id,
  formId: backendSubmission.formId,
  submittedAt: backendSubmission.createdAt,
  data: backendSubmission.data || {},
});

// Max number of undo snapshots to keep
const MAX_HISTORY = 50;

const useFormStore = create((set, get) => ({
  // Current form being edited
  fields: [],
  rows: [],
  selectedField: null,
  currentFormId: null,

  // Undo/Redo history — each entry is { fields, rows }
  _history: [],
  _future: [],

  // All saved forms and submissions
  forms: [],
  submissions: [],

  // Loading and error states
  isLoading: false,
  error: null,

  // --- Undo/Redo helpers ---
  _snapshot: () => {
    const { fields, rows } = get();
    return { fields: [...fields], rows: [...rows] };
  },

  _pushHistory: () => {
    const snapshot = get()._snapshot();
    set((state) => ({
      _history: [...state._history, snapshot].slice(-MAX_HISTORY),
      _future: [],
    }));
  },

  undo: () => {
    const { _history, fields, rows } = get();
    if (!_history.length) return;
    const previous = _history[_history.length - 1];
    const current = { fields: [...fields], rows: [...rows] };
    set((state) => ({
      _history: state._history.slice(0, -1),
      _future: [current, ...state._future],
      fields: previous.fields,
      rows: previous.rows,
    }));
  },

  redo: () => {
    const { _future, fields, rows } = get();
    if (!_future.length) return;
    const next = _future[0];
    const current = { fields: [...fields], rows: [...rows] };
    set((state) => ({
      _future: state._future.slice(1),
      _history: [...state._history, current].slice(-MAX_HISTORY),
      fields: next.fields,
      rows: next.rows,
    }));
  },

  // Load forms from backend (fallback to localStorage)
  loadForms: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendForms = await fetchForms();
      const forms = backendForms.map(normalizeForm);
      set({ forms, isLoading: false });
    } catch (e) {
      console.warn('Failed to load forms from API, falling back to localStorage:', e);
      const stored = loadFromStorage();
      const storedForms = stored?.forms || DEFAULT_FORMS;
      const assignedSlugs = storedForms.map((f) => f.slug).filter(Boolean);
      const forms = storedForms.map((form, index) => {
        const slug = form.slug || generateSlug(form.title || `Untitled Form ${index + 1}`, assignedSlugs);
        if (!form.slug) assignedSlugs.push(slug);
        return { ...form, slug };
      });
      set({
        forms,
        submissions: stored?.submissions || [],
        isLoading: false,
      });
    }
  },

  // Fetch a single form from backend (used by public renderer)
  fetchForm: async (formId) => {
    try {
      const backendForm = await fetchFormFromApi(formId);
      const form = normalizeForm(backendForm);
      set((state) => ({
        forms: state.forms.some((f) => f.id === form.id)
          ? state.forms.map((f) => (f.id === form.id ? form : f))
          : [...state.forms, form],
      }));
      return form;
    } catch (e) {
      console.warn('Failed to fetch form from API:', e);
      return get().forms.find((f) => f.id === formId) || null;
    }
  },

  addRow: (columns = '1', afterRowId) => {
    get()._pushHistory();
    set((state) => {
      const newRow = { id: `row-${Date.now()}`, columns };
      const rows = [...state.rows];
      if (afterRowId) {
        const index = rows.findIndex((r) => r.id === afterRowId);
        rows.splice(index + 1, 0, newRow);
      } else {
        rows.push(newRow);
      }
      return { rows };
    });
  },

  removeRow: (rowId) => {
    get()._pushHistory();
    set((state) => ({
      rows: state.rows.filter((r) => r.id !== rowId),
      fields: state.fields.filter((f) => f.rowId !== rowId),
    }));
  },

  updateRow: (rowId, updates) => {
    get()._pushHistory();
    set((state) => ({
      rows: state.rows.map((r) => (r.id === rowId ? { ...r, ...updates } : r)),
    }));
  },

  duplicateRow: (rowId) => {
    get()._pushHistory();
    set((state) => {
      const srcRow = state.rows.find((r) => r.id === rowId);
      if (!srcRow) return state;
      const newRowId = `row-${Date.now()}`;
      const newRow = { ...srcRow, id: newRowId };

      // Deep-copy all fields in the source row with new IDs
      const srcFields = state.fields.filter((f) => f.rowId === rowId);
      const newFields = srcFields.map((f) => ({
        ...f,
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rowId: newRowId,
        label: f.label ? `${f.label} (copy)` : '',
      }));

      // Insert new row + fields directly after the source
      const rowIndex = state.rows.findIndex((r) => r.id === rowId);
      const newRows = [...state.rows];
      newRows.splice(rowIndex + 1, 0, newRow);

      // Insert new fields after the last field of the source row
      const lastSrcFieldIndex = state.fields.map((f) => f.rowId).lastIndexOf(rowId);
      const allFields = [...state.fields];
      allFields.splice(lastSrcFieldIndex + 1, 0, ...newFields);

      return { rows: newRows, fields: allFields };
    });
  },

  reorderRows: (fromIndex, toIndex) => {
    get()._pushHistory();
    set((state) => {
      const newRows = [...state.rows];
      const [moved] = newRows.splice(fromIndex, 1);
      newRows.splice(toIndex, 0, moved);
      return { rows: newRows };
    });
  },

  addField: (field, rowId) => {
    get()._pushHistory();
    set((state) => {
    const targetRowId = rowId || state.rows[state.rows.length - 1]?.id;
    const fieldWithRow = { ...field, rowId: targetRowId };
    if (!targetRowId) return { fields: [...state.fields, fieldWithRow] };

    const lastIndex = state.fields.map((f) => f.rowId).lastIndexOf(targetRowId);
    const newFields = [...state.fields];
    if (lastIndex === -1) {
      // First field in this row: place it after the last field of the previous row, or at start
      const rowIndex = state.rows.findIndex((r) => r.id === targetRowId);
      const previousRowId = state.rows[rowIndex - 1]?.id;
      const prevLastIndex = previousRowId
        ? state.fields.map((f) => f.rowId).lastIndexOf(previousRowId)
        : -1;
      newFields.splice(prevLastIndex + 1, 0, fieldWithRow);
    } else {
      newFields.splice(lastIndex + 1, 0, fieldWithRow);
    }
    return { fields: newFields };
    });
  },

  removeField: (fieldId) => {
    get()._pushHistory();
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== fieldId),
    }));
  },

  duplicateField: (fieldId) => {
    get()._pushHistory();
    set((state) => {
      const fieldToDuplicate = state.fields.find((f) => f.id === fieldId);
      if (!fieldToDuplicate) return state;

      const duplicatedField = {
        ...fieldToDuplicate,
        id: `field-${Date.now()}`,
        label: `${fieldToDuplicate.label} (copy)`,
      };

      const index = state.fields.findIndex((f) => f.id === fieldId);
      const newFields = [...state.fields];
      newFields.splice(index + 1, 0, duplicatedField);

      return { fields: newFields };
    });
  },

  updateField: (fieldId, updates) => set((state) => ({
    fields: state.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    ),
  })),

  reorderFields: (rowId, fromIndex, toIndex) => {
    get()._pushHistory();
    set((state) => {
      const start = state.fields.findIndex((f) => f.rowId === rowId);
      if (start === -1) return state;
      const newFields = [...state.fields];
      const flatFrom = start + fromIndex;
      const flatTo = start + toIndex;
      const [moved] = newFields.splice(flatFrom, 1);
      newFields.splice(flatTo, 0, moved);
      return { fields: newFields };
    });
  },

  moveFieldToRow: (fieldId, targetRowId) => set((state) => ({
    fields: state.fields.map((f) =>
      f.id === fieldId ? { ...f, rowId: targetRowId } : f
    ),
  })),

  setSelectedField: (fieldId) => set({ selectedField: fieldId }),

  setCurrentForm: (formIdOrSlug) => set((state) => {
    const form = state.forms.find((f) => f.id === formIdOrSlug || f.slug === formIdOrSlug);
    if (form) {
      const theme = form.theme || { ...DEFAULT_THEME };
      let rows = form.rows || [];
      let fields = form.fields || [];
      if (!rows.length && fields.length) {
        const rowId = `row-${Date.now()}`;
        rows = [{ id: rowId, columns: theme.layout || '1' }];
        fields = fields.map((f) => ({ ...f, rowId }));
      }
      return {
        currentFormId: form.id,
        rows,
        fields,
        selectedField: null,
      };
    }
    return state;
  }),

  createNewForm: async () => {
    const baseTitle = 'Untitled Form';
    const existingTitles = get().forms.map((f) => f.title.trim());
    let title = baseTitle;
    let counter = 2;
    while (existingTitles.includes(title)) {
      title = `${baseTitle} ${counter}`;
      counter += 1;
    }

    const existingSlugs = get().forms.map((f) => f.slug);
    const initialRowId = `row-${Date.now()}`;
    const newForm = {
      id: `form-${Date.now()}`,
      title,
      slug: generateSlug(title, existingSlugs),
      description: '',
      rows: [{ id: initialRowId, columns: DEFAULT_THEME.layout || '1' }],
      fields: [],
      theme: { ...DEFAULT_THEME },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const backendForm = await createForm(newForm);
      const form = normalizeForm(backendForm);
      set((state) => ({
        forms: [...state.forms, form],
        currentFormId: form.id,
        fields: form.fields,
        selectedField: null,
      }));
      return form.id;
    } catch (e) {
      console.warn('Failed to create form on API, using localStorage:', e);
      set((state) => ({
        forms: [...state.forms, newForm],
        currentFormId: newForm.id,
        fields: newForm.fields,
        selectedField: null,
      }));
      return newForm.id;
    }
  },

  saveCurrentForm: async (title, description) => {
    const state = get();
    console.log('[saveCurrentForm] Starting save, currentFormId:', state.currentFormId);
    if (!state.currentFormId) return null;

    const currentForm = state.forms.find((f) => f.id === state.currentFormId);
    console.log('[saveCurrentForm] currentForm:', currentForm);
    if (!currentForm) return null;

    const newTitle = title || currentForm.title;
    const existingSlugs = state.forms.filter((f) => f.id !== currentForm.id).map((f) => f.slug);
    const newSlug = newTitle !== currentForm.title
      ? generateSlug(newTitle, existingSlugs)
      : currentForm.slug;

    console.log('[saveCurrentForm] newTitle:', newTitle, 'newSlug:', newSlug, 'fields count:', state.fields.length);

    const updatedForm = {
      ...currentForm,
      title: newTitle,
      slug: newSlug,
      description: description || currentForm.description,
      rows: state.rows,
      fields: state.fields,
      updatedAt: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedForm.id);
    console.log('[saveCurrentForm] isUuid:', isUuid, 'formId:', updatedForm.id);

    set({
      forms: state.forms.map((form) =>
        form.id === state.currentFormId ? updatedForm : form
      ),
    });

    const isConflictError = (e) => e?.response?.status === 409;

    if (!isUuid) {
      console.log('[saveCurrentForm] Creating new form on API');
      try {
        const denormalized = denormalizeForm(updatedForm);
        console.log('[saveCurrentForm] denormalized form:', denormalized);
        const backendForm = await createForm(denormalized);
        console.log('[saveCurrentForm] Created form on API:', backendForm);
        const form = normalizeForm(backendForm);
        set((s) => ({
          forms: s.forms.filter((f) => f.id !== updatedForm.id).concat(form),
          currentFormId: form.id,
        }));
        return form.id;
      } catch (e) {
        if (isConflictError(e)) throw e;
        console.warn('Failed to create form on API:', e);
        return updatedForm.id;
      }
    }

    console.log('[saveCurrentForm] Updating existing form on API');
    try {
      const denormalized = denormalizeForm(updatedForm);
      console.log('[saveCurrentForm] denormalized form:', denormalized);
      await updateFormApi(updatedForm.id, denormalized);
      console.log('[saveCurrentForm] Updated form on API successfully');
      return updatedForm.id;
    } catch (e) {
      if (isConflictError(e)) throw e;
      console.warn('Failed to save form on API:', e);
      return updatedForm.id;
    }
  },

  deleteForm: (formId) => set((state) => {
    deleteFormApi(formId).catch((e) => {
      console.warn('Failed to delete form on API:', e);
    });

    return {
      forms: state.forms.filter((f) => f.id !== formId),
      currentFormId: state.currentFormId === formId ? null : state.currentFormId,
      fields: state.currentFormId === formId ? [] : state.fields,
    };
  }),

  resetForm: () => set({ fields: [], selectedField: null, currentFormId: null }),

  addSubmission: async (formId, data) => {
    try {
      const backendSubmission = await submitForm(formId, data);
      const submission = normalizeSubmission(backendSubmission);
      set((state) => ({ submissions: [...state.submissions, submission] }));
      return submission;
    } catch (e) {
      console.warn('Failed to submit to API:', e);
      throw e;
    }
  },

  deleteSubmission: (submissionId) => set((state) => ({
    submissions: state.submissions.filter((s) => s.id !== submissionId),
  })),

  getSubmissionsForForm: (formId) => get().submissions.filter((s) => s.formId === formId),

  loadSubmissions: async (formId) => {
    try {
      const backendSubmissions = await fetchSubmissions(formId);
      const submissions = backendSubmissions.map(normalizeSubmission);
      set((state) => ({
        submissions: [
          ...state.submissions.filter((s) => s.formId !== formId),
          ...submissions,
        ],
      }));
    } catch (e) {
      console.warn('Failed to load submissions from API:', e);
    }
  },

  updateFormSchedule: (schedule) => set((state) => {
    if (!state.currentFormId) return state;
    const updatedForms = state.forms.map((form) =>
      form.id === state.currentFormId
        ? { ...form, accessSchedule: schedule, updatedAt: new Date().toISOString() }
        : form
    );
    const updatedForm = updatedForms.find((f) => f.id === state.currentFormId);
    if (updatedForm) {
      updateFormApi(updatedForm.id, denormalizeForm(updatedForm)).catch((e) => {
        console.warn('Failed to save form schedule on API:', e);
      });
    }
    return { forms: updatedForms };
  }),

  updateFormTheme: (themeUpdates) => set((state) => {
    if (!state.currentFormId) return state;

    const updatedForms = state.forms.map((form) =>
      form.id === state.currentFormId
        ? {
            ...form,
            theme: { ...form.theme, ...themeUpdates },
            updatedAt: new Date().toISOString(),
          }
        : form
    );

    const updatedForm = updatedForms.find((f) => f.id === state.currentFormId);
    if (updatedForm) {
      updateFormApi(updatedForm.id, denormalizeForm(updatedForm)).catch((e) => {
        console.warn('Failed to save form theme on API:', e);
      });
    }

    return { forms: updatedForms };
  }),

  // --- Version History ---
  formVersions: [],
  versionsLoading: false,

  loadVersions: async (formId) => {
    set({ versionsLoading: true });
    try {
      const versions = await fetchVersionsApi(formId);
      set({ formVersions: versions, versionsLoading: false });
    } catch (e) {
      console.warn('Failed to load form versions:', e);
      set({ versionsLoading: false });
    }
  },

  restoreVersion: async (formId, versionId) => {
    try {
      const backendForm = await restoreVersionApi(formId, versionId);
      const form = normalizeForm(backendForm);
      set((state) => ({
        forms: state.forms.map((f) => (f.id === form.id ? form : f)),
        currentFormId: form.id,
        fields: form.fields,
        rows: form.rows,
      }));
      // Reload versions list after restore
      get().loadVersions(formId);
      return form;
    } catch (e) {
      console.warn('Failed to restore form version:', e);
      throw e;
    }
  },
}));

useFormStore.subscribe((state) => {
  saveToStorage(state.forms, state.submissions);
});

export default useFormStore;
