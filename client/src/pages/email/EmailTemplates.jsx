import { useEffect, useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useConfirm } from '../../components/Dialog';

export default function EmailTemplates() {
  const navigate = useNavigate();
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try { const { data } = await api.get('/email/templates'); setTemplates(data); } finally { setLoading(false); }
  };

  useEffect(() => { loadTemplates(); }, []);

  const remove = async (template) => {
    const confirmed = await confirmDialog({ title: 'Delete this template?', message: `“${template.name}” cannot be recovered.`, variant: 'danger' });
    if (!confirmed) return;
    await api.delete(`/email/templates/${template.id}`);
    setTemplates((items) => items.filter((item) => item.id !== template.id));
  };

  return <div className="mx-auto max-w-7xl p-6 lg:p-8">
    <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-display font-bold text-base">Email templates</h1><p className="mt-1 text-body text-muted">Create reusable, email-safe message layouts.</p></div><button type="button" onClick={() => navigate('/hub-admin/email/templates/new')} className="inline-flex min-h-[44px] items-center gap-2 rounded-base bg-primary px-4 text-body font-medium text-primary-foreground hover:bg-primary-hover"><Plus className="h-4 w-4" />New template</button></div>
    {loading ? <p className="text-muted">Loading templates…</p> : templates.length === 0 ? <div className="rounded-card border border-dashed border-border bg-surface p-12 text-center"><Copy className="mx-auto h-8 w-8 text-subtle" /><h2 className="mt-4 font-semibold text-base">Start with a template</h2><p className="mt-2 text-body text-muted">Build a reusable email layout, then use it when creating campaigns.</p></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <article key={template.id} className="rounded-card border border-border bg-surface p-5 shadow-card-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-base">{template.name}</h2><p className="mt-1 truncate text-small text-muted">{template.subject || 'No subject'}</p></div><span className="rounded-sm bg-surface-raised px-2 py-1 text-small text-muted">{template.status}</span></div><p className="mt-5 text-small text-subtle">Updated {new Date(template.updatedAt).toLocaleDateString()}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => navigate(`/hub-admin/email/templates/${template.id}/edit`)} className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-base border border-border text-body hover:bg-surface-raised"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={() => remove(template)} className="inline-flex min-h-[40px] w-10 items-center justify-center rounded-base border border-border text-danger hover:bg-danger-light" aria-label={`Delete ${template.name}`}><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
    {ConfirmDialogMount}
  </div>;
}
