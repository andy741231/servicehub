import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Clock, History, RefreshCw, RotateCcw, User, X } from 'lucide-react';
import api from '../../utils/api';

const formatDateTime = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function WebVersionHistoryPanel({ slug, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/web/page/${slug}/versions`);
      setVersions(data.versions || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const restore = async (versionId) => {
    setRestoringId(versionId);
    setError('');
    try {
      const { data } = await api.post(`/web/page/${slug}/versions/${versionId}/restore`);
      onRestored(data.page);
      await loadVersions();
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Failed to restore this version.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl" role="dialog" aria-modal="true" aria-label="Page version history">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="font-semibold text-base">Version History</h2></div>
        <div className="flex gap-1"><button onClick={loadVersions} disabled={loading} className="p-2 text-muted hover:bg-surface-raised rounded" aria-label="Refresh history"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={onClose} className="p-2 text-muted hover:bg-surface-raised rounded" aria-label="Close history"><X className="h-4 w-4" /></button></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="py-12 text-center text-muted">Loading versions…</div>}
        {!loading && error && <div className="rounded-base border border-danger/20 bg-danger-light p-3 text-sm text-danger"><div className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div></div>}
        {!loading && !error && versions.length === 0 && <div className="py-12 text-center text-muted"><History className="mx-auto mb-3 h-10 w-10" /><p>No saved versions yet.</p><p className="mt-1 text-sm">Saving a page creates a recoverable version.</p></div>}
        {!loading && versions.length > 0 && <ol className="space-y-2">{versions.map((version, index) => {
          const expanded = expandedId === version.id;
          const latest = index === 0;
          return <li key={version.id} className="rounded-base border border-border bg-background">
            <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setExpandedId(expanded ? null : version.id)} aria-expanded={expanded}>
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${latest ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted'}`}>v{version.versionNumber}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-base">{version.title}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="h-3 w-3" />{formatDateTime(version.createdAt)}</span></span>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
            </button>
            {expanded && <div className="space-y-3 border-t border-border px-3 pb-3 pt-3"><p className="flex items-center gap-1.5 text-sm text-muted"><User className="h-3.5 w-3.5" />Saved by {version.savedByName}</p>{latest ? <p className="text-xs italic text-muted">This is the latest saved version.</p> : <button onClick={() => restore(version.id)} disabled={!!restoringId} className="flex w-full items-center justify-center gap-2 rounded-base bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />{restoringId === version.id ? 'Restoring…' : 'Restore this version'}</button>}</div>}
          </li>;
        })}</ol>}
      </div>
    </aside>
  );
}
