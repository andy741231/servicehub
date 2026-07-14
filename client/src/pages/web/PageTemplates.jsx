import { useCallback, useEffect, useState } from 'react';
import { Copy, FileStack, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import { useConfirm } from '../../components/Dialog';
import { useToast } from '../../components/Toast';

export default function PageTemplates() {
  const confirm = useConfirm();
  const { toast, ToastMount } = useToast();
  const [templates, setTemplates] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState({});
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: templateData }, { data: pageData }] = await Promise.all([api.get('/web/page-templates'), api.get('/web/pages')]);
      setTemplates(templateData.templates || []);
      setPages((pageData || []).filter((page) => !page.href));
    } catch (error) {
      toast('Failed to load Web page templates.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const applyTemplate = async (template) => {
    const slug = selectedPages[template.id];
    if (!slug) return toast('Choose a page to apply this template to.', 'error');
    const page = pages.find((item) => item.slug === slug);
    const approved = await confirm({ title: 'Apply page template?', message: `This will replace the content of “${page?.title || slug}”. Its current state will be saved in version history.`, confirmLabel: 'Apply template', variant: 'danger' });
    if (!approved) return;
    setApplyingId(template.id);
    try {
      await api.post(`/web/page-templates/${template.id}/apply/${slug}`);
      toast(`Applied “${template.name}” to ${page?.title || slug}.`);
    } catch (error) {
      toast(error?.response?.data?.error || 'Failed to apply template.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const removeTemplate = async (template) => {
    const approved = await confirm({ title: 'Delete page template?', message: `Delete “${template.name}”? Existing pages will not be affected.`, confirmLabel: 'Delete', variant: 'danger' });
    if (!approved) return;
    try {
      await api.delete(`/web/page-templates/${template.id}`);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      toast('Page template deleted.');
    } catch (error) {
      toast(error?.response?.data?.error || 'Failed to delete template.', 'error');
    }
  };

  return <div className="min-h-screen bg-background p-6 lg:p-8"><div className="mx-auto max-w-7xl">
    <PageHeader title="Page Templates" description="Reusable Web Builder layouts. Save the page you are editing as a template, then apply it here to another page." actions={<button onClick={load} disabled={loading} className="inline-flex min-h-[40px] items-center gap-2 rounded-base border border-border px-3 text-sm font-medium hover:bg-surface-raised disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
    {loading ? <div className="py-16 text-center text-muted">Loading templates…</div> : templates.length === 0 ? <div className="mt-6 rounded-card border border-dashed border-border bg-surface p-12 text-center"><FileStack className="mx-auto mb-4 h-12 w-12 text-muted" /><h2 className="text-lg font-semibold text-base">No page templates yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">Open a page in the Website Editor and choose Save as template to add a reusable layout.</p></div> : <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{templates.map((template) => <article key={template.id} className="flex min-h-64 flex-col rounded-card border border-border bg-surface p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary-light p-2 text-primary"><Copy className="h-5 w-5" /></div><div><h2 className="font-semibold text-base">{template.name}</h2><p className="mt-0.5 text-xs text-muted">{template.snapshot?.sections?.length || 0} sections</p></div></div><button onClick={() => removeTemplate(template)} className="rounded p-2 text-muted hover:bg-danger-light hover:text-danger" aria-label={`Delete ${template.name}`}><Trash2 className="h-4 w-4" /></button></div><p className="mt-4 flex-1 text-sm text-muted">{template.description || 'Reusable page layout'}</p><p className="mt-4 text-xs text-subtle">Saved by {template.createdByName} · {new Date(template.updatedAt).toLocaleDateString()}</p><div className="mt-4 flex gap-2"><select value={selectedPages[template.id] || ''} onChange={(event) => setSelectedPages((current) => ({ ...current, [template.id]: event.target.value }))} className="min-w-0 flex-1 rounded-base border border-border bg-background px-2 py-2 text-sm"><option value="">Choose page…</option>{pages.map((page) => <option key={page.id} value={page.slug}>{page.title}</option>)}</select><button onClick={() => applyTemplate(template)} disabled={applyingId === template.id} className="inline-flex items-center gap-1.5 rounded-base bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"><Copy className="h-3.5 w-3.5" />{applyingId === template.id ? 'Applying…' : 'Apply'}</button></div></article>)}</div>}
  </div>{ToastMount}</div>;
}
