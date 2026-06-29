import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Eye, Download, Settings, ArrowLeft, Share2, Copy, Check } from 'lucide-react';
import FormCanvas from './components/FormCanvas';
import FormRenderer from './components/FormRenderer';
import FieldPalette from './components/FieldPalette';
import PropertiesPanel from './components/PropertiesPanel';
import useFormStore from './store/formStore';
import { isDuplicateName } from './utils/slug';

export default function FormsBuilder() {
  const navigate = useNavigate();
  const { formSlug } = useParams();
  const [selectedField, setSelectedField] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const {
    fields,
    addField,
    removeField,
    duplicateField,
    currentFormId,
    forms,
    setCurrentForm,
    saveCurrentForm,
    createNewForm,
    isLoading
  } = useFormStore();

  const findFormBySlug = (slug) => forms.find((f) => f.slug === slug || f.id === slug);

  useEffect(() => {
    if (formSlug) {
      const form = findFormBySlug(formSlug);
      if (form) {
        setCurrentForm(form.id);
        setFormTitle(form.title);
        setFormDescription(form.description);
      }
    } else if (!currentFormId) {
      const create = async () => {
        const newFormId = await createNewForm();
        const latestForms = useFormStore.getState().forms;
        const newForm = latestForms.find((f) => f.id === newFormId) || latestForms.find((f) => f.slug === newFormId);
        if (newForm?.slug) {
          navigate(`/hub-admin/forms/builder/${newForm.slug}`, { replace: true });
        }
      };
      create();
    }
  }, [formSlug, currentFormId, forms, setCurrentForm, createNewForm, navigate]);

  const handleAddField = (type) => {
    const newField = {
      id: `field-${Date.now()}`,
      type,
      label: '',
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'checkbox' ? [''] : [],
      content: type === 'content' ? '' : undefined,
      columns: type === 'grid' ? [[], []] : undefined,
      columnCount: type === 'grid' ? 2 : undefined,
      maxStars: type === 'rating' ? 5 : undefined,
      accept: type === 'file' ? '' : undefined,
      maxSize: type === 'file' ? 5 : undefined,
      signatureType: type === 'signature' ? 'draw' : undefined,
    };
    addField(newField);
  };

  const handleSelectField = (fieldId) => {
    setSelectedField(fieldId);
  };

  const handleDeleteField = (fieldId) => {
    removeField(fieldId);
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  };

  const handleDuplicateField = (fieldId) => {
    duplicateField(fieldId);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (currentFormId && isDuplicateName(formTitle, forms, currentFormId)) {
      setSaveError('A form with this name already exists. Please use a unique name.');
      return;
    }

    setIsSaving(true);
    try {
      saveCurrentForm(formTitle, formDescription);
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedForm = useFormStore.getState().forms.find((f) => f.id === currentFormId);
      if (updatedForm && formSlug && updatedForm.slug !== formSlug) {
        navigate(`/hub-admin/forms/builder/${updatedForm.slug}`, { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const formSchema = JSON.stringify({ 
      title: formTitle,
      description: formDescription,
      fields 
    }, null, 2);
    const blob = new Blob([formSchema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '-').toLowerCase()}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToDashboard = () => {
    navigate('/hub-admin/forms');
  };

  const handleShareForm = () => {
    const currentForm = forms.find((f) => f.id === currentFormId);
    const formUrl = `${window.location.origin}/form/${currentForm?.slug || currentFormId}`;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    });
  };

  if (showPreview) {
    const currentForm = forms.find((f) => f.id === currentFormId);
    if (!currentForm) return null;

    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-base text-body hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
        </div>
        <FormRenderer
          form={{
            ...currentForm,
            title: formTitle,
            description: formDescription,
            fields,
          }}
          preview
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Field Palette */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col" aria-label="Field palette">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-base">Form Builder</h2>
          <p className="text-small text-muted mt-1">Drag fields to canvas</p>
        </div>
        <FieldPalette onAddField={handleAddField} />
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToDashboard}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
              title="Back to dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save form"
              aria-label="Save form"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleShareForm}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              title="Share form"
              aria-label="Share form"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span className="text-body">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span className="text-body">Share</span>
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              title="Export JSON schema"
              aria-label="Export form schema"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">Export</span>
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              title="Preview form"
              aria-label="Preview form"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">Preview</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-surface-raised border border-border rounded-lg p-6">
              <div className="mb-6">
                <label htmlFor="form-title" className="sr-only">Form title</label>
                <input
                  id="form-title"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Form Title"
                  className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-base placeholder:text-muted"
                  aria-label="Form title"
                />
                <label htmlFor="form-description" className="sr-only">Form description</label>
                <textarea
                  id="form-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Form description"
                  className="w-full mt-2 text-body bg-transparent border-none focus:outline-none focus:ring-0 text-muted placeholder:text-muted resize-none"
                  rows={2}
                  aria-label="Form description"
                />
                {saveError && (
                  <p className="mt-2 text-small text-red-600 bg-red-50 px-3 py-2 rounded-base">
                    {saveError}
                  </p>
                )}
              </div>
              <FormCanvas
                fields={fields}
                onSelectField={handleSelectField}
                onDeleteField={handleDeleteField}
                onDuplicateField={handleDuplicateField}
                selectedField={selectedField}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Properties Panel */}
      <aside className="w-80 bg-surface border-l border-border flex flex-col" aria-label="Field properties">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-base">Properties</h2>
          <p className="text-small text-muted mt-1">
            {selectedField ? 'Edit field properties' : 'Select a field to edit'}
          </p>
        </div>
        <PropertiesPanel
          selectedField={selectedField}
          onUpdateField={() => {}}
        />
      </aside>
    </div>
  );
}