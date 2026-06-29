import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Edit, BarChart3, Clock, Search, Share2, Check, TrendingUp } from 'lucide-react';
import useFormStore from './store/formStore';

export default function FormsDashboard() {
  const navigate = useNavigate();
  const { forms, createNewForm, deleteForm, setCurrentForm, loadForms, isLoading } = useFormStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFormId, setCopiedFormId] = useState(null);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCreateForm = async () => {
    const newFormId = await createNewForm();
    const newForm = useFormStore.getState().forms.find((f) => f.id === newFormId);
    navigate(`/hub-admin/forms/builder/${newForm?.slug || newFormId}`);
  };

  const handleEditForm = (formId) => {
    setCurrentForm(formId);
    const form = forms.find((f) => f.id === formId);
    navigate(`/hub-admin/forms/builder/${form?.slug || formId}`);
  };

  const handleViewSubmissions = (formId) => {
    setCurrentForm(formId);
    navigate('/hub-admin/forms/submissions');
  };

  const handleViewAnalytics = (formId) => {
    setCurrentForm(formId);
    const form = forms.find((f) => f.id === formId);
    navigate(`/hub-admin/forms/analytics/${form?.slug || formId}`);
  };

  const handleDeleteForm = (formId) => {
    if (window.confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      deleteForm(formId);
    }
  };

  const handleShareForm = (formId) => {
    const form = forms.find((f) => f.id === formId);
    const formUrl = `${window.location.origin}/form/${form?.slug || formId}`;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(null), 2000);
    });
  };

  const filteredForms = forms.filter((form) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      form.title.toLowerCase().includes(searchLower) ||
      form.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-base">Forms</h1>
            <p className="text-body text-muted mt-1">Create and manage your forms</p>
          </div>
          <button
            onClick={handleCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
            aria-label="Create new form"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="text-body">Create Form</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
          <input
            type="text"
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
            aria-label="Search forms"
          />
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">Total Forms</div>
            <div className="text-2xl font-bold text-base mt-1">{forms.length}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">Active Forms</div>
            <div className="text-2xl font-bold text-base mt-1">{forms.length}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">Total Fields</div>
            <div className="text-2xl font-bold text-base mt-1">
              {forms.reduce((acc, form) => acc + form.fields.length, 0)}
            </div>
          </div>
        </div>

        {/* Forms Grid */}
        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-subtle mx-auto mb-3" />
            <p className="text-body text-muted">
              {searchQuery ? 'No forms match your search' : 'No forms yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateForm}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
              >
                Create your first form
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="bg-surface-raised border border-border rounded-lg p-6 hover:border-border-dark transition-colors duration-150"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-base truncate">{form.title}</h3>
                    <p className="text-small text-muted mt-1">{form.fields.length} fields</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleShareForm(form.id)}
                      className="p-2 text-subtle hover:text-muted hover:bg-surface rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                      title="Share form"
                      aria-label={`Share ${form.title}`}
                    >
                      {copiedFormId === form.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditForm(form.id)}
                      className="p-2 text-subtle hover:text-muted hover:bg-surface rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                      title="Edit form"
                      aria-label={`Edit ${form.title}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-2 text-subtle hover:text-red-500 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                      title="Delete form"
                      aria-label={`Delete ${form.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-body text-muted mb-4 line-clamp-2">{form.description || 'No description'}</p>

                <div className="flex items-center gap-4 text-small text-muted mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEditForm(form.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="text-body">Edit</span>
                  </button>
                  <button
                    onClick={() => handleViewSubmissions(form.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-body">Submissions</span>
                  </button>
                  <button
                    onClick={() => handleViewAnalytics(form.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-body">Analytics</span>
                  </button>
                  <button
                    onClick={() => handleShareForm(form.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                  >
                    {copiedFormId === form.id ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span className="text-body">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        <span className="text-body">Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}