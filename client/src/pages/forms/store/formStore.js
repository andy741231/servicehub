import { create } from 'zustand';
import {
  fetchForms,
  fetchForm as fetchFormFromApi,
  createForm,
  updateForm as updateFormApi,
  deleteForm as deleteFormApi,
  submitForm,
  fetchSubmissions,
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
  showProgressBar: false,
  showQuestionNumbers: false,
  buttonText: 'Submit Form',
  thankYouTitle: 'Thank You!',
  thankYouMessage: 'Your form has been submitted successfully.',
  redirectUrl: '',
};

const DEFAULT_FORMS = [
  {
    id: 'form-1',
    title: 'Contact Form',
    description: 'Basic contact information collection',
    fields: [
      { id: 'field-1', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { id: 'field-2', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
      { id: 'field-3', type: 'textarea', label: 'Message', placeholder: 'Your message', required: true },
    ],
    theme: { ...DEFAULT_THEME },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'form-2',
    title: 'Survey Form',
    description: 'Customer satisfaction survey',
    fields: [
      { id: 'field-4', type: 'text', label: 'Company Name', placeholder: 'Company name', required: true },
      { id: 'field-5', type: 'select', label: 'Industry', placeholder: 'Select industry', required: true, options: ['Technology', 'Healthcare', 'Finance', 'Other'] },
      { id: 'field-6', type: 'number', label: 'Employees', placeholder: 'Number of employees', required: false },
    ],
    theme: { ...DEFAULT_THEME },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const normalizeForm = (backendForm) => {
  const schema = backendForm.schema || {};
  return {
    ...schema,
    id: backendForm.id,
    title: backendForm.title || schema.title || 'Untitled Form',
    slug: schema.slug || generateSlug(backendForm.title || schema.title || 'Untitled Form'),
    fields: schema.fields || [],
    description: schema.description || '',
    theme: schema.theme || { ...DEFAULT_THEME },
    createdAt: backendForm.createdAt,
    updatedAt: backendForm.updatedAt,
  };
};

const denormalizeForm = (clientForm) => ({
  title: clientForm.title,
  schema: clientForm,
});

const normalizeSubmission = (backendSubmission) => ({
  id: backendSubmission.id,
  formId: backendSubmission.formId,
  submittedAt: backendSubmission.createdAt,
  data: backendSubmission.data || {},
});

const useFormStore = create((set, get) => ({
  // Current form being edited
  fields: [],
  selectedField: null,
  currentFormId: null,

  // All saved forms and submissions
  forms: [],
  submissions: [],

  // Loading and error states
  isLoading: false,
  error: null,

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

  addField: (field) => set((state) => ({ fields: [...state.fields, field] })),

  addFieldToGrid: (gridId, columnIndex, field) => set((state) => ({
    fields: state.fields.map((f) => {
      if (f.id === gridId && f.type === 'grid') {
        const newColumns = [...f.columns];
        newColumns[columnIndex] = [...(newColumns[columnIndex] || []), field];
        return { ...f, columns: newColumns };
      }
      return f;
    }),
  })),

  removeField: (fieldId) => set((state) => ({
    fields: state.fields.filter((f) => f.id !== fieldId),
  })),

  removeFieldFromGrid: (gridId, fieldId) => set((state) => ({
    fields: state.fields.map((f) => {
      if (f.id === gridId && f.type === 'grid') {
        const newColumns = f.columns.map((column) =>
          column.filter((field) => field.id !== fieldId)
        );
        return { ...f, columns: newColumns };
      }
      return f;
    }),
  })),

  duplicateField: (fieldId) => set((state) => {
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
  }),

  updateField: (fieldId, updates) => set((state) => ({
    fields: state.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    ),
  })),

  updateGridField: (gridId, fieldId, updates) => set((state) => ({
    fields: state.fields.map((f) => {
      if (f.id === gridId && f.type === 'grid') {
        const newColumns = f.columns.map((column) =>
          column.map((field) =>
            field.id === fieldId ? { ...field, ...updates } : field
          )
        );
        return { ...f, columns: newColumns };
      }
      return f;
    }),
  })),

  reorderFields: (fromIndex, toIndex) => set((state) => {
    const newFields = [...state.fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    return { fields: newFields };
  }),

  setSelectedField: (fieldId) => set({ selectedField: fieldId }),

  setCurrentForm: (formIdOrSlug) => set((state) => {
    const form = state.forms.find((f) => f.id === formIdOrSlug || f.slug === formIdOrSlug);
    if (form) {
      return {
        currentFormId: form.id,
        fields: form.fields,
        selectedField: null,
      };
    }
    return state;
  }),

  createNewForm: async () => {
    const title = 'Untitled Form';
    const existingSlugs = get().forms.map((f) => f.slug);
    const newForm = {
      id: `form-${Date.now()}`,
      title,
      slug: generateSlug(title, existingSlugs),
      description: '',
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

  saveCurrentForm: (title, description) => set((state) => {
    if (!state.currentFormId) return state;

    const currentForm = state.forms.find((f) => f.id === state.currentFormId);
    if (!currentForm) return state;

    const newTitle = title || currentForm.title;
    const existingSlugs = state.forms.filter((f) => f.id !== currentForm.id).map((f) => f.slug);
    const newSlug = newTitle !== currentForm.title
      ? generateSlug(newTitle, existingSlugs)
      : currentForm.slug;

    const updatedForms = state.forms.map((form) =>
      form.id === state.currentFormId
        ? {
            ...form,
            title: newTitle,
            slug: newSlug,
            description: description || form.description,
            fields: state.fields,
            updatedAt: new Date().toISOString(),
          }
        : form
    );

    const updatedForm = updatedForms.find((f) => f.id === state.currentFormId);
    if (updatedForm) {
      updateFormApi(updatedForm.id, denormalizeForm(updatedForm)).catch((e) => {
        console.warn('Failed to save form on API:', e);
      });
    }

    return { forms: updatedForms, currentFormId: updatedForm?.id || state.currentFormId };
  }),

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

  addSubmission: async (formId, data) => set((state) => {
    const newSubmission = {
      id: `sub-${Date.now()}`,
      formId,
      submittedAt: new Date().toISOString(),
      data,
    };

    submitForm(formId, data).catch((e) => {
      console.warn('Failed to submit to API:', e);
    });

    return { submissions: [...state.submissions, newSubmission] };
  }),

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
}));

useFormStore.subscribe((state) => {
  saveToStorage(state.forms, state.submissions);
});

export default useFormStore;
