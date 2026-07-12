import { useState, useEffect, useCallback } from 'react';
import { Inbox, Mail, Trash2, ChevronLeft, Loader2, Search } from 'lucide-react';
import api from '../../utils/api';

export default function InboundEmails() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/email/inbound', { params: { page, limit: 20 } });
      setEmails(res.data.emails);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch inbound emails:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this email?')) return;
    try {
      await api.delete(`/email/inbound/${id}`);
      setEmails(emails.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const filtered = emails.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.fromEmail?.toLowerCase().includes(q) ||
      e.subject?.toLowerCase().includes(q) ||
      e.fromName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Inbox className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Inbound Emails</h1>
        <span className="text-sm text-subtle">serviceoffice@churchinhouston.org</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email list */}
        <div className="lg:col-span-1 space-y-2">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-subtle" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-subtle text-sm py-8 text-center">No emails found.</p>
          ) : (
            filtered.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelected(email)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === email.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {email.fromName || email.fromEmail}
                    </p>
                    <p className="text-xs text-subtle truncate">{email.subject}</p>
                  </div>
                  <span className="text-xs text-subtle whitespace-nowrap">
                    {new Date(email.receivedAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-surface"
              >
                Prev
              </button>
              <span className="text-sm text-subtle">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-surface"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Email detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded hover:bg-surface lg:hidden"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold">{selected.subject}</h2>
                </div>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex gap-2">
                  <span className="text-subtle font-medium w-16">From:</span>
                  <span>{selected.fromName ? `${selected.fromName} <${selected.fromEmail}>` : selected.fromEmail}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-subtle font-medium w-16">To:</span>
                  <span>{selected.toEmail}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-subtle font-medium w-16">Date:</span>
                  <span>{new Date(selected.receivedAt).toLocaleString()}</span>
                </div>
                {selected.labels?.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-subtle font-medium w-16">Labels:</span>
                    <div className="flex flex-wrap gap-1">
                      {selected.labels.map((label) => (
                        <span key={label} className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                {selected.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-sans">{selected.bodyText || '(no body)'}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg p-12 text-center">
              <Mail className="w-12 h-12 text-subtle mx-auto mb-4" />
              <p className="text-subtle">Select an email to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
