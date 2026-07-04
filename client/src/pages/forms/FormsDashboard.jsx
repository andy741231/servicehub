import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Trash2, Edit, BarChart3, Search, Share2, Check,
  TrendingUp, Inbox, Sparkles, ArrowUpDown, MoreHorizontal, Copy, Pencil,
  AlertTriangle, X, LayoutGrid, List, Eye, LayoutTemplate, Upload, Plug, Bell,
} from 'lucide-react';
import useFormStore from './store/formStore';
import { useToast } from '../../components/Toast';

// Derive a lightweight status from the form's content.
// Forms with no fields are "Draft"; anything with fields is "Published"
// unless explicitly set to "closed".
const deriveStatus = (form) => form.status || ((form.fields?.length || 0) === 0 ? 'draft' : 'published');

const STATUS_META = {
  published: { label: 'Live', badge: 'badge-success', pillClass: 'text-success' },
  draft:     { label: 'Draft', badge: 'badge-neutral', pillClass: 'text-warning' },
  closed:    { label: 'Closed', badge: 'badge-neutral', pillClass: 'text-text-muted' },
};

// Soft tint backgrounds for card previews (replaces heavy gradient stripes)
const COVER_TINTS = [
  'bg-blue-50',
  'bg-emerald-50',
  'bg-rose-50',
  'bg-amber-50',
  'bg-violet-50',
  'bg-cyan-50',
];

// Solid color backgrounds for list-mode avatar tiles
const COVER_SOLIDS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-cyan-500',
];

const _hashId = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};
const coverTintFor = (id = '') => COVER_TINTS[_hashId(id) % COVER_TINTS.length];
const coverSolidFor = (id = '') => COVER_SOLIDS[_hashId(id) % COVER_SOLIDS.length];

const initials = (title = '') =>
  title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

function timeAgo(date) {
  if (!date) return '—';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(date).toLocaleDateString();
}

export default function FormsDashboard() {
  const navigate = useNavigate();
  const { forms, createNewForm, deleteForm, renameForm, setCurrentForm, loadForms, isLoading, submissions, setFormStatus } = useFormStore();
  const { toast, ToastMount } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft' | 'closed'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'submissions' | 'alpha'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [copiedFormId, setCopiedFormId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  // Rename modal state
  const [renaming, setRenaming] = useState(null); // { id, title, original }
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef(null);
  // Delete confirm modal state
  const [deleting, setDeleting] = useState(null); // form object pending confirmation

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
    const form = forms.find((f) => f.id === formId);
    setDeleting(form || { id: formId, title: 'this form' });
    setMenuOpenId(null);
  };

  const confirmDelete = () => {
    if (deleting) {
      deleteForm(deleting.id);
      toast(`"${deleting.title}" deleted.`, 'success');
    }
    setDeleting(null);
  };

  const handleShareForm = async (formId) => {
    const form = forms.find((f) => f.id === formId);
    const formUrl = `${window.location.origin}/form/${form?.slug || formId}`;
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(null), 2000);
      toast('Share link copied to clipboard.', 'success');
    } catch (e) {
      // Clipboard API can fail in non-secure contexts / denied permissions.
      // Fall back to a toast containing the link so the user can still copy it.
      toast(`Copy failed — link: ${formUrl}`, 'info');
    }
    setMenuOpenId(null);
  };

  const handleRenameClick = (formId) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;
    setRenaming({ id: formId, title: form.title, original: form.title });
    setRenameError('');
    setMenuOpenId(null);
    // Focus the input after the modal mounts
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renaming) return;
    const trimmed = renaming.title.trim();
    if (!trimmed) { setRenameError('Title cannot be empty.'); return; }
    if (trimmed === renaming.original) { setRenaming(null); return; }
    setIsRenaming(true);
    setRenameError('');
    try {
      await renameForm(renaming.id, trimmed);
      toast(`Renamed to "${trimmed}".`, 'success');
      setRenaming(null);
    } catch (err) {
      if (err?.code === 'CONFLICT' || err?.response?.status === 409) {
        setRenameError('A form with this name already exists.');
      } else {
        setRenameError(err?.message || 'Failed to rename. Please try again.');
      }
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDuplicate = async (formId) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;
    const newFormId = await createNewForm();
    // Best-effort: copy content into the newly created form via the store
    const store = useFormStore.getState();
    store.setCurrentForm(newFormId);
    // Replace fields/rows with the source form's
    useFormStore.setState({
      fields: form.fields?.map((f) => ({ ...f, id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })) || [],
      rows: form.rows?.map((r) => ({ ...r, id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })) || [],
    });
    await store.saveCurrentForm(`${form.title} (copy)`, form.description);
    setMenuOpenId(null);
  };

  const handleCloseForm = (formId) => {
    setFormStatus(formId, 'closed');
    toast('Form closed.', 'info');
    setMenuOpenId(null);
  };

  const handleReopenForm = (formId) => {
    setFormStatus(formId, 'published');
    toast('Form reopened.', 'success');
    setMenuOpenId(null);
  };

  const submissionCountFor = (formId) => submissions.filter((s) => s.formId === formId).length;

  const stats = useMemo(() => {
    const published = forms.filter((f) => deriveStatus(f) === 'published').length;
    const closed = forms.filter((f) => deriveStatus(f) === 'closed').length;
    const draft = forms.length - published - closed;
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const twoWeeksAgo = now - 14 * 864e5;
    const thisWeek = submissions.filter((s) => new Date(s.submittedAt).getTime() >= weekAgo).length;
    const lastWeek = submissions.filter((s) => {
      const t = new Date(s.submittedAt).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    const subsTrend = lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
    const totalSubs = submissions.length;
    const avgFields = forms.length > 0
      ? Math.round(forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0) / forms.length)
      : 0;
    return {
      total: forms.length,
      published,
      draft,
      closed,
      totalSubs,
      thisWeek,
      subsTrend,
      avgFields,
      weekSubs: thisWeek,
    };
  }, [forms, submissions]);

  const filteredForms = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    let list = forms.filter((form) => {
      const matchesSearch = !searchLower ||
        form.title.toLowerCase().includes(searchLower) ||
        (form.description || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || deriveStatus(form) === statusFilter;
      return matchesSearch && matchesStatus;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'submissions') return submissionCountFor(b.id) - submissionCountFor(a.id);
      // recent
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, searchQuery, statusFilter, sortBy, submissions]);

  return (
    <div className="bg-background">
      {/* Frosted sub-header bar */}
      <div className="sticky top-0 z-30 h-14 flex items-center gap-3 px-6 bg-surface/70 backdrop-blur-xl border-b border-border-soft">
        <span className="text-sm text-text-muted">Workspace</span>
        <span className="text-text-subtle">/</span>
        <span className="font-medium text-text-base text-sm">Forms</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52 lg:w-64 pl-9 pr-3 py-1.5 bg-surface-raised/60 border border-border-soft rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-colors"
              aria-label="Search forms"
            />
          </div>
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-raised transition-colors" aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-surface" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-400 text-white flex items-center justify-center text-xs font-semibold cursor-pointer">
            AM
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ gridAutoRows: '132px' }}>
          {/* Hero: Total Submissions */}
          <div className="col-span-2 row-span-1 rounded-2xl p-5 text-white bg-gradient-to-br from-primary to-indigo-600 relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="text-sm text-white/75 mb-1">Total Submissions</div>
            <div className="text-4xl font-bold tracking-tight">{stats.totalSubs.toLocaleString()}</div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.subsTrend > 0 ? '+' : ''}{stats.subsTrend}% <span className="text-white/60 font-normal">vs last week</span>
            </div>
          </div>

          {/* Active Forms */}
          <div className="rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-text-muted">Active Forms</div>
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.published}</div>
            <div className="mt-auto text-sm font-semibold text-success flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.draft} draft{stats.draft !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Completion ring — avg fields per form */}
          <div className="rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm flex items-center gap-3">
            <svg width="88" height="88" className="-rotate-90 flex-shrink-0" role="img" aria-label={`${stats.avgFields} avg fields per form`}>
              <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--surface-raised))" strokeWidth="6" />
              <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--success))" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 36}
                      strokeDashoffset={2 * Math.PI * 36 * (1 - Math.min(stats.avgFields / 20, 1))} />
            </svg>
            <div>
              <div className="text-2xl font-bold text-text-base">{stats.avgFields}</div>
              <div className="text-xs text-text-muted">avg fields/form</div>
            </div>
          </div>

          {/* Total Forms — dark tile */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-gray-800 to-gray-900 text-white relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="text-sm text-white/75 mb-1">Total Forms</div>
            <div className="text-3xl font-bold tracking-tight">{stats.total}</div>
            <div className="mt-auto text-sm text-white/60">
              {stats.closed} closed
            </div>
          </div>

          {/* Drafts tile */}
          <div className="rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="text-sm text-text-muted mb-1">Drafts</div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.draft}</div>
            <div className="mt-auto text-sm text-text-muted">
              {stats.published} live · {stats.closed} closed
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Plus} label="Blank Form" desc="Start from scratch" color="primary" onClick={handleCreateForm} />
              <QuickAction icon={LayoutTemplate} label="Template" desc="Pick a starting point" color="purple" onClick={() => navigate('/hub-admin/forms/templates')} />
              <QuickAction icon={Upload} label="Import" desc="Upload a CSV" color="success" onClick={() => toast('Import coming soon.', 'info')} />
              <QuickAction icon={Plug} label="Integrate" desc="Connect an app" color="warning" onClick={() => toast('Integrations coming soon.', 'info')} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status filter tabs with counts */}
          <div className="inline-flex gap-0.5 bg-surface border border-border rounded-xl p-1">
            {[
              { id: 'all', label: 'All', count: stats.total },
              { id: 'published', label: 'Live', count: stats.published },
              { id: 'draft', label: 'Drafts', count: stats.draft },
              { id: 'closed', label: 'Closed', count: stats.closed },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${statusFilter === id
                  ? 'bg-text-base text-white'
                  : 'text-text-muted hover:bg-surface-raised'}`}
                aria-pressed={statusFilter === id}
              >
                {label}
                <span className={`text-xs ${statusFilter === id ? 'text-white/70' : 'text-text-subtle'}`}>{count}</span>
              </button>
            ))}
          </div>

          {/* Search (mobile — hidden on sm+ since sub-header has it) */}
          <div className="relative flex-1 sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body placeholder:text-text-muted min-h-[44px]"
              aria-label="Search forms"
            />
          </div>

          {/* Sort */}
          <div className="relative sm:ml-auto">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-9 pr-8 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px] appearance-none cursor-pointer"
              aria-label="Sort forms"
            >
              <option value="recent">Recently updated</option>
              <option value="submissions">Most submissions</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="inline-flex gap-0.5 bg-surface border border-border rounded-xl p-1" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-text-base text-white' : 'text-text-muted hover:bg-surface-raised'}`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-text-base text-white' : 'text-text-muted hover:bg-surface-raised'}`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Forms Grid / List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-body text-text-muted">Loading forms...</p>
          </div>
        ) : filteredForms.length === 0 && !searchQuery && statusFilter === 'all' ? (
          <EmptyState onCreate={handleCreateForm} />
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-text-subtle mx-auto mb-3" />
            <p className="text-body text-text-muted">No forms match your filters</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {filteredForms.map((form) => {
              const status = deriveStatus(form);
              const meta = STATUS_META[status];
              const subCount = submissionCountFor(form.id);
              const fieldCount = form.fields?.length || 0;
              return (
                <div
                  key={form.id}
                  className="form-card group flex items-center gap-4 p-3 rounded-xl bg-surface border border-border hover:border-border-strong hover:shadow-card-sm transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${coverSolidFor(form.id)}`}>
                    {initials(form.title)}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditForm(form.id)} role="button" aria-label={`Open ${form.title}`}>
                    <div className="font-semibold truncate text-text-base">{form.title}</div>
                    <div className="text-xs text-text-muted truncate">{form.description || 'No description'}</div>
                  </div>
                  <span className={`badge ${meta.badge} hidden sm:inline-flex`}>{meta.label}</span>
                  <span className="text-sm tabular-nums w-16 text-right text-text-base hidden sm:inline">{subCount}</span>
                  <span className="text-xs text-text-subtle w-20 text-right hidden md:inline">{timeAgo(form.updatedAt)}</span>
                  <div className="relative flex-shrink-0">
                    <div className="flex gap-1 quick-actions">
                      <button className="icon-btn-sm" onClick={() => handleViewSubmissions(form.id)} aria-label="View submissions">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="icon-btn-sm" onClick={() => handleEditForm(form.id)} aria-label="Edit form">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)}
                        className="icon-btn-sm"
                        aria-label="More actions"
                        aria-haspopup="menu"
                        aria-expanded={menuOpenId === form.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    {menuOpenId === form.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-9 z-20 w-44 bg-surface border border-border rounded-base shadow-dropdown py-1" role="menu">
                          <MenuItem icon={Edit} label="Edit" onClick={() => handleEditForm(form.id)} />
                          <MenuItem icon={Pencil} label="Rename" onClick={() => handleRenameClick(form.id)} />
                          <MenuItem icon={Copy} label="Duplicate" onClick={() => handleDuplicate(form.id)} />
                          <MenuItem icon={Share2} label="Share link" onClick={() => handleShareForm(form.id)} />
                          <MenuItem icon={BarChart3} label="Submissions" onClick={() => handleViewSubmissions(form.id)} />
                          <MenuItem icon={TrendingUp} label="Analytics" onClick={() => handleViewAnalytics(form.id)} />
                          {status === 'closed'
                            ? <MenuItem icon={Check} label="Reopen" onClick={() => handleReopenForm(form.id)} />
                            : <MenuItem icon={X} label="Close form" onClick={() => handleCloseForm(form.id)} />}
                          <div className="my-1 border-t border-border" />
                          <MenuItem icon={Trash2} label="Delete" onClick={() => handleDeleteForm(form.id)} danger />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <button
              onClick={handleCreateForm}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary hover:text-primary text-text-muted transition-all"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Create new form</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredForms.map((form) => {
              const status = deriveStatus(form);
              const meta = STATUS_META[status];
              const subCount = submissionCountFor(form.id);
              const fieldCount = form.fields?.length || 0;
              return (
                <div
                  key={form.id}
                  className="form-card group bg-surface border border-border-soft rounded-2xl overflow-hidden hover:border-border-strong hover:shadow-card transition-all duration-200 flex flex-col"
                >
                  {/* Mini form preview */}
                  <div
                    className={`h-32 relative p-4 overflow-hidden cursor-pointer ${coverTintFor(form.id)}`}
                    onClick={() => handleEditForm(form.id)}
                    role="button"
                    aria-label={`Open ${form.title}`}
                  >
                    <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 bg-white/85 backdrop-blur ${meta.pillClass}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {meta.label}
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="h-2 w-3/5 rounded bg-text-base/15" />
                      <div className="h-5 w-full rounded bg-text-base/10" />
                      <div className="h-2 w-4/5 rounded bg-text-base/15" />
                      <div className="h-5 w-full rounded bg-text-base/10" />
                      {fieldCount > 4 && <div className="h-5 w-full rounded bg-text-base/10" />}
                      <div className="h-6 w-20 rounded bg-text-base/25 mt-auto" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-text-base truncate flex-1 cursor-pointer" onClick={() => handleEditForm(form.id)}>{form.title}</h3>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)}
                          className="p-1.5 text-text-subtle hover:text-text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary min-w-[32px] min-h-[32px]"
                          aria-label="More actions"
                          aria-haspopup="menu"
                          aria-expanded={menuOpenId === form.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpenId === form.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-44 bg-surface border border-border rounded-base shadow-dropdown py-1" role="menu">
                              <MenuItem icon={Edit} label="Edit" onClick={() => handleEditForm(form.id)} />
                              <MenuItem icon={Pencil} label="Rename" onClick={() => handleRenameClick(form.id)} />
                              <MenuItem icon={Copy} label="Duplicate" onClick={() => handleDuplicate(form.id)} />
                              <MenuItem icon={Share2} label="Share link" onClick={() => handleShareForm(form.id)} />
                              <MenuItem icon={BarChart3} label="Submissions" onClick={() => handleViewSubmissions(form.id)} />
                              <MenuItem icon={TrendingUp} label="Analytics" onClick={() => handleViewAnalytics(form.id)} />
                              {status === 'closed'
                                ? <MenuItem icon={Check} label="Reopen" onClick={() => handleReopenForm(form.id)} />
                                : <MenuItem icon={X} label="Close form" onClick={() => handleCloseForm(form.id)} />}
                              <div className="my-1 border-t border-border" />
                              <MenuItem icon={Trash2} label="Delete" onClick={() => handleDeleteForm(form.id)} danger />
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-text-muted mb-3 line-clamp-2 flex-1">{form.description || 'No description'}</p>

                    {/* Meta stats row */}
                    <div className="flex gap-4 py-3 border-t border-border-soft">
                      <div className="flex flex-col">
                        <div className="text-base font-bold tabular-nums text-text-base">{subCount}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Submits</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-base font-bold tabular-nums text-text-base">{fieldCount}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Questions</div>
                      </div>
                      <div className="flex flex-col">
                        <div className="text-base font-bold tabular-nums text-text-base">{timeAgo(form.updatedAt)}</div>
                        <div className="text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Updated</div>
                      </div>
                    </div>

                    {/* Hover-reveal actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-soft">
                      <div className="flex gap-1 quick-actions">
                        <button className="icon-btn-sm" onClick={() => handleViewSubmissions(form.id)} aria-label="View submissions">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="icon-btn-sm" onClick={() => handleEditForm(form.id)} aria-label="Edit form">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="icon-btn-sm" onClick={() => handleShareForm(form.id)} aria-label="Share form">
                          {copiedFormId === form.id ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
                        </button>
                      </div>
                      <span className="text-xs text-text-subtle">{meta.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* In-grid "Create new form" card */}
            <button
              onClick={handleCreateForm}
              className="min-h-[280px] rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/50 hover:text-primary text-text-muted transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold">Create new form</div>
                <div className="text-sm text-text-muted">Start from scratch or a template</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Rename modal */}
      {renaming && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-dialog-title"
          onClick={() => !isRenaming && setRenaming(null)}
        >
          <form
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-raised border border-border rounded-xl shadow-xl p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="rename-dialog-title" className="text-lg font-bold text-base">Rename form</h2>
                <p className="text-small text-muted mt-0.5">The share link slug will update automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => !isRenaming && setRenaming(null)}
                className="p-1.5 text-subtle hover:text-muted hover:bg-surface rounded focus:outline-none focus:ring-2 focus:ring-primary min-w-[32px] min-h-[32px]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor="rename-input" className="block text-small font-medium text-base mb-1.5">Form name</label>
            <input
              id="rename-input"
              ref={renameInputRef}
              type="text"
              value={renaming.title}
              onChange={(e) => { setRenaming({ ...renaming, title: e.target.value }); setRenameError(''); }}
              disabled={isRenaming}
              className="w-full px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px]"
              placeholder="Form name"
            />
            {renameError && (
              <p role="alert" className="mt-2 text-small text-danger flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {renameError}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                disabled={isRenaming}
                className="px-4 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[40px] text-body transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRenaming || !renaming.title.trim()}
                className="px-4 py-2 bg-primary text-white rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[40px] text-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRenaming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setDeleting(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-raised border border-border rounded-xl shadow-xl p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="min-w-0">
                <h2 id="delete-dialog-title" className="text-lg font-bold text-base">Delete form?</h2>
                <p className="text-body text-muted mt-1">
                  <span className="font-medium text-base">"{deleting.title}"</span> and all of its submissions will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="px-4 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[40px] text-body transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                autoFocus
                className="px-4 py-2 bg-danger text-white rounded-base hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-h-[40px] text-body font-medium transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastMount}
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, color, onClick }) {
  const colorMap = {
    primary: 'bg-primary text-white',
    purple:  'bg-purple-500 text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
  };
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-raised hover:bg-surface-tertiary transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-text-base">{label}</div>
        <div className="text-xs text-text-muted">{desc}</div>
      </div>
    </button>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`w-full flex items-center gap-2 px-3 py-2 text-small text-left hover:bg-surface-raised transition-colors ${danger ? 'text-danger hover:bg-danger-light' : 'text-base'}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function EmptyState({ onCreate }) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary-light flex items-center justify-center">
        <FileText className="h-10 w-10 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-base mb-2">Build your first form</h2>
      <p className="text-body text-muted max-w-md mx-auto mb-6">
        Create contact forms, surveys, and questionnaires with a drag-and-drop builder.
        Share a link and collect responses instantly.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
        >
          <Plus className="h-4 w-4" />
          Create your first form
        </button>
        <button
          onClick={() => navigate('/hub-admin/forms/templates')}
          className="flex items-center gap-2 px-5 py-2.5 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
        >
          <Sparkles className="h-4 w-4" />
          Browse templates
        </button>
      </div>
    </div>
  );
}
