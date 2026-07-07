import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, User, MessageSquare, Star, Calendar, Briefcase, Mail, X } from 'lucide-react';
import useFormStore from './store/formStore';

// Built-in form templates. Each defines rows + fields that get cloned into a
// freshly created form when the user picks "Use this template".
export const TEMPLATES = [
  {
    id: 'contact',
    title: 'Contact Form',
    description: 'A simple way for visitors to reach you.',
    icon: Mail,
    color: 'from-blue-500 to-indigo-500',
    fields: [
      { type: 'text', label: 'Name', placeholder: 'Your name', required: true },
      { type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
      { type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true },
    ],
  },
  {
    id: 'feedback',
    title: 'Customer Feedback',
    description: 'Measure satisfaction with a rating and comments.',
    icon: Star,
    color: 'from-amber-500 to-orange-500',
    fields: [
      { type: 'text', label: 'Name', placeholder: 'Your name' },
      { type: 'rating', label: 'How satisfied are you?', maxStars: 5, required: true },
      { type: 'textarea', label: 'What can we improve?', placeholder: 'Tell us more…' },
    ],
  },
  {
    id: 'event-rsvp',
    title: 'Event RSVP',
    description: 'Collect attendances and dietary preferences.',
    icon: Calendar,
    color: 'from-emerald-500 to-teal-500',
    fields: [
      { type: 'name', label: 'Full Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'select', label: 'Will you attend?', options: ['Yes, I will be there', 'Maybe', 'No, I cannot make it'], required: true },
      { type: 'checkbox', label: 'Dietary requirements', options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal'] },
      { type: 'textarea', label: 'Anything else?' },
    ],
  },
  {
    id: 'job-app',
    title: 'Job Application',
    description: 'Gather applicant details and a cover letter.',
    icon: Briefcase,
    color: 'from-violet-500 to-purple-500',
    fields: [
      { type: 'name', label: 'Full Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'phone', label: 'Phone' },
      { type: 'text', label: 'Position applying for', required: true },
      { type: 'textarea', label: 'Cover letter', required: true },
      { type: 'file', label: 'Resume / CV', accept: '.pdf,.doc,.docx' },
    ],
  },
  {
    id: 'support',
    title: 'Support Request',
    description: 'Triage customer issues with priority and details.',
    icon: MessageSquare,
    color: 'from-rose-500 to-pink-500',
    fields: [
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'select', label: 'Priority', options: ['Low', 'Medium', 'High', 'Urgent'], required: true },
      { type: 'textarea', label: 'Describe the issue', required: true },
    ],
  },
  {
    id: 'lead',
    title: 'Lead Capture',
    description: 'Turn visitors into leads with qualified info.',
    icon: User,
    color: 'from-cyan-500 to-sky-500',
    fields: [
      { type: 'text', label: 'Company name', required: true },
      { type: 'name', label: 'Contact name', required: true },
      { type: 'email', label: 'Work email', required: true },
      { type: 'phone', label: 'Phone' },
      { type: 'select', label: 'Company size', options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
      { type: 'textarea', label: 'What are you looking for?' },
    ],
  },
];

export default function FormTemplates() {
  const navigate = useNavigate();
  const { createNewForm, setCurrentForm, saveCurrentForm } = useFormStore();
  const [creatingId, setCreatingId] = useState(null);
  const [error, setError] = useState(null);

  // Append " (N)" to the title until it's unique among existing forms
  const uniqueTitleFor = (baseTitle) => {
    const existing = useFormStore.getState().forms;
    if (!existing.some((f) => f.title === baseTitle)) return baseTitle;
    let n = 2;
    while (existing.some((f) => f.title === `${baseTitle} (${n})`)) n++;
    return `${baseTitle} (${n})`;
  };

  const useTemplate = async (template) => {
    setCreatingId(template.id);
    setError(null);
    try {
      const newFormId = await createNewForm();
      const store = useFormStore.getState();
      store.setCurrentForm(newFormId);
      const rowId = `row-${Date.now()}`;
      const fields = template.fields.map((f) => ({
        ...f,
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rowId,
        required: f.required || false,
        options: f.options ? [...f.options] : (f.type === 'select' || f.type === 'checkbox' ? [''] : undefined),
      }));
      useFormStore.setState({
        rows: [{ id: rowId, columns: '1' }],
        fields,
      });

      // Try the base title, then append " (N)" on 409 conflicts.
      // The server may have forms the client hasn't loaded yet.
      let title = uniqueTitleFor(template.title);
      let attempts = 0;
      while (attempts < 5) {
        try {
          await saveCurrentForm(title, template.description);
          break;
        } catch (e) {
          if (e?.response?.status === 409 && attempts < 4) {
            attempts++;
            title = `${template.title} (${attempts + 1})`;
            // Also update the store's form title so the retry uses it
            const cur = useFormStore.getState();
            useFormStore.setState({
              forms: cur.forms.map((f) =>
                f.id === cur.currentFormId ? { ...f, title } : f
              ),
            });
          } else {
            throw e;
          }
        }
      }

      const updated = useFormStore.getState().forms.find((f) => f.id === useFormStore.getState().currentFormId);
      navigate(`/hub-admin/forms/builder/${updated?.slug || newFormId}`);
    } catch (e) {
      console.error('Failed to create form from template:', e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to create form from template';
      setError(`Could not create "${template.title}": ${msg}`);
      setCreatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/hub-admin/forms/list')}
            className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px] transition-colors"
            aria-label="Back to forms"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-light border border-danger/20 rounded-base text-sm text-danger flex items-start justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-danger hover:text-danger p-1 -m-1 rounded"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isCreating = creatingId === t.id;
            return (
              <div key={t.id} className="bg-surface-raised border border-border rounded-xl overflow-hidden hover:shadow-card transition-all duration-200 flex flex-col">
                <div className={`h-24 bg-gradient-to-r ${t.color} flex items-center justify-center`}>
                  <Icon className="h-10 w-10 text-primary-foreground/90" aria-hidden="true" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-base mb-1">{t.title}</h3>
                  <p className="text-small text-muted mb-4 flex-1">{t.description}</p>
                  <div className="text-xs text-subtle mb-4">{t.fields.length} fields</div>
                  <button
                    onClick={() => useTemplate(t)}
                    disabled={isCreating}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors disabled:opacity-60"
                  >
                    {isCreating ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Creating…</>
                    ) : (
                      <><Check className="h-4 w-4" /> Use this template</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
