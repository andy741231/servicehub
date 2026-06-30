import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Eye, Download, ArrowLeft, Share2, Copy, Check, Plus, X, Rows3, Undo2, Redo2, History } from 'lucide-react';
import FormCanvas from './components/FormCanvas';
import FormRenderer from './components/FormRenderer';
import { FIELD_TYPES } from './components/FieldPalette';
import PropertiesPanel from './components/PropertiesPanel';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import useFormStore from './store/formStore';
import { isDuplicateName } from './utils/slug';

export default function FormsBuilder() {
  const navigate = useNavigate();
  const { formSlug } = useParams();
  const [selectedField, setSelectedField] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [targetRowId, setTargetRowId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const {
    fields,
    rows,
    addField,
    addRow,
    removeRow,
    updateRow,
    duplicateRow,
    reorderRows,
    removeField,
    duplicateField,
    currentFormId,
    forms,
    setCurrentForm,
    saveCurrentForm,
    createNewForm,
    loadForms,
    isLoading,
    undo,
    redo,
    _history,
    _future,
  } = useFormStore();

  // Keyboard shortcuts: Escape closes modal, Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showFieldModal) {
        setShowFieldModal(false);
        setTargetRowId(null);
        return;
      }
      const isInputTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
        e.target.isContentEditable;
      if (isInputTarget) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFieldModal, undo, redo]);

  const currentForm = forms.find((f) => f.id === currentFormId);
  const findFormBySlug = (slug) => forms.find((f) => f.slug === slug || f.id === slug);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  useEffect(() => {
    if (formSlug) {
      const form = findFormBySlug(formSlug);
      if (form) {
        setCurrentForm(form.id);
        setFormTitle(form.title);
        setFormDescription(form.description);
      }
    } else if (!currentFormId && !isLoading) {
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
  }, [formSlug, currentFormId, forms, setCurrentForm, createNewForm, navigate, isLoading]);

  const handleAddField = (type) => {
    const id = `field-${Date.now()}`;
    const newField = {
      id,
      type,
      label: '',
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'checkbox' ? [''] : [],
      content: type === 'content' ? '' : undefined,
      accept: type === 'file' ? '' : undefined,
      maxSize: type === 'file' ? 5 : undefined,
    };
    const rowId = targetRowId || (selectedField ? fields.find((f) => f.id === selectedField)?.rowId : undefined) || rows[rows.length - 1]?.id;
    addField(newField, rowId);
    setSelectedField(id);
    setShowFieldModal(false);
    setTargetRowId(null);
  };

  const handleSelectField = (fieldId) => {
    setSelectedField(fieldId);
    setSelectedSection(null);
  };

  const handleSelectSection = (rowId) => {
    setSelectedSection(rowId);
    setSelectedField(null);
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
    const latestForms = useFormStore.getState().forms;
    const latestCurrentFormId = useFormStore.getState().currentFormId;
    if (latestCurrentFormId && isDuplicateName(formTitle, latestForms, latestCurrentFormId)) {
      setSaveError('A form with this name already exists. Please use a unique name.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCurrentForm(formTitle, formDescription);

      const updatedForm = useFormStore.getState().forms.find((f) => f.id === useFormStore.getState().currentFormId);
      if (updatedForm && formSlug && updatedForm.slug !== formSlug) {
        navigate(`/hub-admin/forms/builder/${updatedForm.slug}`, { replace: true });
      }
    } catch (e) {
      console.error('Error saving form:', e);
      const message = e?.response?.data?.error || e?.message || 'Failed to save form. Please try again.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const formSchema = JSON.stringify({ 
      title: formTitle,
      description: formDescription,
      rows,
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

  if (isLoading && !currentFormId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-body text-muted">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
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
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <button
              onClick={undo}
              disabled={!_history.length}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!_future.length}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border" aria-hidden="true" />
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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              title="Preview form"
              aria-label="Preview form"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">Preview</span>
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
              onClick={() => setShowHistory((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 ${showHistory ? 'bg-primary text-white border-primary' : 'bg-surface-raised border-border hover:bg-surface'}`}
              title="Version history"
              aria-label="Version history"
              aria-pressed={showHistory}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">History</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div
          className="flex-1 overflow-y-auto bg-background"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); }
          }}
        >
          <div
            className={`mx-auto px-8 py-8 ${rows.some((r) => r.columns !== '1') ? 'max-w-6xl' : 'max-w-3xl'}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); }
            }}
          >
            {/* Form header */}
            <div className="mb-8" onClick={(e) => { if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); } }}>
              <label htmlFor="form-title" className="sr-only">Form title</label>
              <input
                id="form-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Form Title"
                className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-base placeholder:text-muted"
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
              rows={rows}
              onSelectField={handleSelectField}
              onDeleteField={handleDeleteField}
              onDuplicateField={handleDuplicateField}
              onInsertField={(rowId) => { setTargetRowId(rowId); setShowFieldModal(true); }}
              onAddRow={(afterRowId) => addRow('1', afterRowId)}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
              onDuplicateRow={duplicateRow}
              onReorderRows={reorderRows}
              selectedField={selectedField}
              selectedSection={selectedSection}
              onSelectSection={handleSelectSection}
            />
          </div>
        </div>
      </main>

      {/* Right Sidebar - Version History or Properties Panel */}
      <aside className="w-80 bg-surface border-l border-border flex flex-col" aria-label={showHistory ? 'Version history' : 'Properties panel'}>
        {showHistory ? (
          <VersionHistoryPanel
            formId={currentFormId}
            onClose={() => setShowHistory(false)}
            onRestored={(form) => {
              setFormTitle(form.title);
              setFormDescription(form.description || '');
              setShowHistory(false);
            }}
          />
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold text-base">
                {selectedField ? 'Field Properties' : selectedSection ? 'Section Properties' : 'Form Properties'}
              </h2>
              <p className="text-small text-muted mt-1">
                {selectedField ? 'Edit the selected field' : selectedSection ? 'Edit the selected section' : 'Form-wide settings & theme'}
              </p>
            </div>
            <PropertiesPanel
              selectedField={selectedField}
              selectedSection={selectedSection}
              onUpdateField={() => {}}
            />
          </>
        )}
      </aside>

      {/* Insert new field modal */}
      {showFieldModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => { setShowFieldModal(false); setTargetRowId(null); }}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-base">Insert new field</h3>
                  <p className="text-small text-muted">Choose a field type to add to your form</p>
                </div>
              </div>
              <button
                onClick={() => { setShowFieldModal(false); setTargetRowId(null); }}
                className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
                title="Close (Esc)"
                aria-label="Close field picker"
              >
                <X className="w-5 h-5 text-subtle" />
              </button>
            </div>

            {/* Options grid */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
                  <button
                    key={type}
                    onClick={() => handleAddField(type)}
                    className="p-5 border-2 border-border rounded-xl hover:border-primary hover:bg-primary-light/50 hover:shadow-lg transition-all duration-200 text-left group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    aria-label={`Add ${label} field`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-raised group-hover:bg-primary-light flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon className="w-6 h-6 text-subtle group-hover:text-primary transition-colors" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{label}</div>
                        <p className="text-small text-muted">{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => { setShowFieldModal(false); setTargetRowId(null); }}
                className="px-5 py-2.5 border border-border text-base rounded-xl hover:bg-surface-raised transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}