import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Trash2, BarChart3, Search, Check,
  TrendingUp, Inbox, Sparkles, ArrowUpDown, MoreHorizontal, Copy, Pencil,
  AlertTriangle, X, LayoutGrid, List, ExternalLink, LayoutTemplate, Upload, Plug,
  Folder, FolderPlus,
} from 'lucide-react';
import useFormStore from './store/formStore';
import { useToast } from '../../components/Toast';

// Derive a lightweight status from the form's content.
// Forms with no fields are "Draft"; anything with fields is "Published"
// unless explicitly set to "closed".
const deriveStatus = (form) => form.status || ((form.fields?.length || 0) === 0 ? 'draft' : 'published');

const STATUS_META = {
  published: { label: 'Live', badge: 'badge-success', pillClass: 'text-success', headerBg: 'bg-emerald-500', dotClass: 'bg-emerald-500' },
  draft:     { label: 'Draft', badge: 'badge-neutral', pillClass: 'text-warning', headerBg: 'bg-amber-500', dotClass: 'bg-amber-500' },
  closed:    { label: 'Closed', badge: 'badge-neutral', pillClass: 'text-text-muted', headerBg: 'bg-gray-500', dotClass: 'bg-gray-500' },
};

function StatusPill({ status, variant = 'solid' }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  if (variant === 'tint') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/85 backdrop-blur ${meta.pillClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {meta.label}
      </span>
    );
  }
  return (
    <span className={`badge ${meta.badge} inline-flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.pillClass.replace('text-', 'bg-')}`} />
      {meta.label}
    </span>
  );
}

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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('forms-view-mode') || 'list');
  const [menuOpenId, setMenuOpenId] = useState(null);
  // Folder state (localStorage-backed)
  const [folders, setFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forms-folders') || '[]'); } catch { return []; }
  });
  const [formFolders, setFormFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forms-folder-map') || '{}'); } catch { return {}; }
  });
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [selectedFormIds, setSelectedFormIds] = useState(new Set());
  const [showBatchBar, setShowBatchBar] = useState(false);
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

  useEffect(() => { localStorage.setItem('forms-view-mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('forms-folders', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { localStorage.setItem('forms-folder-map', JSON.stringify(formFolders)); }, [formFolders]);
  useEffect(() => { setSelectedFormIds(new Set()); }, [selectedFolder]);

  const handleCreateForm = async () => {
    const newFormId = await createNewForm();
    if (selectedFolder !== 'all') {
      setFormFolders(prev => ({ ...prev, [newFormId]: selectedFolder }));
    }
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

  const handlePreviewForm = (formId) => {
    const form = forms.find((f) => f.id === formId);
    const formUrl = `${window.location.origin}/form/${form?.slug || formId}`;
    window.open(formUrl, '_blank', 'noopener,noreferrer');
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

  const handleCreateFolder = () => {
    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;
    const id = `folder-${Date.now()}`;
    setFolders(prev => [...prev, { id, name: name.trim() }]);
    toast(`Folder "${name.trim()}" created.`, 'success');
  };

  const handleRenameFolder = (folderId, newName) => {
    if (!newName?.trim()) return;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
    toast(`Folder renamed to "${newName.trim()}".`, 'success');
  };

  const handleMoveToFolder = (formId, folderId) => {
    setFormFolders(prev => {
      const next = { ...prev };
      next[formId] = folderId;
      return next;
    });
    setMenuOpenId(null);
  };

  const handleDeleteFolder = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    if (!window.confirm(`Delete folder "${folder.name}"? Forms inside will be unassigned.`)) return;
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setFormFolders(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(fid => { if (next[fid] === folderId) delete next[fid]; });
      return next;
    });
    if (selectedFolder === folderId) setSelectedFolder('all');
    toast('Folder deleted. Forms moved to All Forms.', 'info');
  };

  const handleBatchMove = (folderId) => {
    setFormFolders(prev => {
      const next = { ...prev };
      selectedFormIds.forEach(id => { next[id] = folderId; });
      return next;
    });
    toast(`${selectedFormIds.size} form${selectedFormIds.size !== 1 ? 's' : ''} moved.`, 'success');
    setSelectedFormIds(new Set());
    setShowBatchBar(false);
  };

  const toggleSelect = (formId) => {
    setSelectedFormIds(prev => {
      const next = new Set(prev);
      if (next.has(formId)) next.delete(formId);
      else next.add(formId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFormIds.size === filteredForms.length) {
      setSelectedFormIds(new Set());
    } else {
      setSelectedFormIds(new Set(filteredForms.map(f => f.id)));
    }
  };

  const clearSelection = () => {
    setSelectedFormIds(new Set());
    setShowBatchBar(false);
  };

  const [draggedFormId, setDraggedFormId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const handleDragStart = (e, formId) => {
    setDraggedFormId(formId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e, folderId) => {
    e.preventDefault();
    if (draggedFormId) {
      handleMoveToFolder(draggedFormId, folderId);
    }
    setDraggedFormId(null);
    setDragOverFolder(null);
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

  const folderCounts = useMemo(() => {
    const counts = { all: forms.length };
    folders.forEach(f => { counts[f.id] = 0; });
    forms.forEach(f => {
      const fid = formFolders[f.id];
      if (fid && counts[fid] !== undefined) counts[fid]++;
    });
    return counts;
  }, [forms, folders, formFolders]);

  const filteredForms = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    let list = forms.filter((form) => {
      const matchesSearch = !searchLower ||
        form.title.toLowerCase().includes(searchLower) ||
        (form.description || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || deriveStatus(form) === statusFilter;
      const matchesFolder = selectedFolder === 'all' ||
        formFolders[form.id] === selectedFolder;
      return matchesSearch && matchesStatus && matchesFolder;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'submissions') return submissionCountFor(b.id) - submissionCountFor(a.id);
      // recent
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, searchQuery, statusFilter, sortBy, submissions, formFolders, selectedFolder]);

  return (
    <div className="bg-background">
      {/* Frosted sub-header bar */}
      <div className="sticky top-0 z-30 h-14 flex items-center gap-3 px-6 bg-surface/70 backdrop-blur-xl border-b border-border-soft">
        <h1 className="text-base font-semibold text-text-base">Forms</h1>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Total Submissions */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-white bg-gradient-to-br from-primary to-indigo-600 relative overflow-hidden shadow-card flex flex-col">
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
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
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
          <div className="min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm flex items-center gap-3">
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
          <div className="min-h-[132px] rounded-2xl p-5 bg-gradient-to-br from-gray-800 to-gray-900 text-white relative overflow-hidden shadow-card flex flex-col">
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
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="text-sm text-text-muted mb-1">Drafts</div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.draft}</div>
            <div className="mt-auto text-sm text-text-muted">
              {stats.published} live · {stats.closed} closed
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
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

          {/* Search */}
          <div className="relative flex-1 sm:flex-none sm:w-56 lg:w-64 sm:ml-auto">
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
          <div className="relative">
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

        {/* Mobile folder selector (list view only) */}
        {viewMode === 'list' && folders.length > 0 && (
          <div className="md:hidden mb-4">
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              aria-label="Select folder"
            >
              <option value="all">All Forms ({folderCounts.all})</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({folderCounts[f.id] || 0})</option>
              ))}
            </select>
          </div>
        )}

        {/* Forms Grid / List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-body text-text-muted">Loading forms...</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex gap-6">
            {/* Folder sidebar */}
            <div className="w-52 flex-shrink-0 hidden md:block">
              <div className="sticky top-20">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Folders</span>
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 text-text-subtle hover:text-primary hover:bg-primary-light rounded transition-colors"
                    aria-label="New folder"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => setSelectedFolder('all')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedFolder === 'all' ? 'bg-primary-light text-primary' : 'text-text-muted hover:bg-surface-raised'}`}
                  >
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">All Forms</span>
                    <span className="text-xs text-text-subtle tabular-nums">{folderCounts.all}</span>
                  </button>
                  {folders.length > 0 && <div className="my-1.5 border-t border-border-soft" />}
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className="group relative"
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder.id)}
                    >
                      <button
                        onClick={() => setSelectedFolder(folder.id)}
                        onDoubleClick={() => {
                          const newName = window.prompt('Rename folder:', folder.name);
                          if (newName?.trim() && newName.trim() !== folder.name) handleRenameFolder(folder.id, newName);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${selectedFolder === folder.id ? 'bg-primary-light text-primary' : 'text-text-muted hover:bg-surface-raised'} ${dragOverFolder === folder.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                      >
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-text-subtle tabular-nums">{folderCounts[folder.id] || 0}</span>
                      </button>
                      <div className="absolute right-7 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = window.prompt('Rename folder:', folder.name);
                            if (newName?.trim() && newName.trim() !== folder.name) handleRenameFolder(folder.id, newName);
                          }}
                          className="p-1 text-text-subtle hover:text-primary rounded"
                          aria-label={`Rename folder ${folder.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="p-1 text-text-subtle hover:text-danger rounded"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {folders.length === 0 && (
                  <p className="text-xs text-text-subtle px-3 py-2">No folders yet. Click + to create one.</p>
                )}
              </div>
            </div>

            {/* Form list */}
            <div className="flex-1 flex flex-col gap-2">
            {/* Batch action bar */}
            {selectedFormIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-light border border-primary/20">
                <span className="text-sm font-semibold text-primary">{selectedFormIds.size} selected</span>
                <div className="flex items-center gap-1.5">
                  {folders.length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) handleBatchMove(e.target.value); }}
                      className="px-3 py-1.5 bg-surface border border-border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px] cursor-pointer"
                    >
                      <option value="" disabled>Move to folder…</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-text-muted">Create a folder first</span>
                  )}
                </div>
                <button
                  onClick={clearSelection}
                  className="ml-auto text-sm text-text-muted hover:text-text-base transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
            {/* Select-all header */}
            {filteredForms.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={selectedFormIds.size === filteredForms.length && filteredForms.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  aria-label="Select all forms"
                />
                <span className="text-xs text-text-subtle font-medium">
                  {selectedFormIds.size > 0 ? `${selectedFormIds.size} of ${filteredForms.length} selected` : 'Select all'}
                </span>
              </div>
            )}
            {filteredForms.length > 0 && folders.length > 0 && (
              <div className="text-xs text-text-subtle px-1 pb-1 hidden md:block">
                Tip: Drag a form onto a folder to move it.
              </div>
            )}
            {filteredForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-text-subtle mx-auto mb-3" />
                <p className="text-body text-text-muted mb-4">
                  {forms.length === 0 ? 'No forms yet.' : 'No forms in this folder.'}
                </p>
                <button
                  onClick={handleCreateForm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[40px] text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {forms.length === 0 ? 'Create your first form' : 'Create form in this folder'}
                </button>
              </div>
            ) : (
            <>
            {filteredForms.map((form) => {
              const status = deriveStatus(form);
              const subCount = submissionCountFor(form.id);
              const fieldCount = form.fields?.length || 0;
              return (
                <div
                  key={form.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, form.id)}
                  className={`form-card group flex items-center gap-4 p-3 rounded-xl bg-surface border hover:border-border-strong hover:shadow-card-sm transition-all ${selectedFormIds.has(form.id) ? 'border-primary bg-primary-light/30' : 'border-border'} ${draggedFormId === form.id ? 'opacity-40' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFormIds.has(form.id)}
                    onChange={() => toggleSelect(form.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                    aria-label={`Select ${form.title}`}
                  />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${STATUS_META[status].headerBg}`}>
                    {initials(form.title)}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditForm(form.id)} role="button" aria-label={`Open ${form.title}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate text-text-base">{form.title}</span>
                      {formFolders[form.id] && folders.find(f => f.id === formFolders[form.id]) && (
                        <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-raised text-text-muted flex-shrink-0">
                          <Folder className="h-3 w-3" />
                          {folders.find(f => f.id === formFolders[form.id]).name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted truncate">{form.description || 'No description'}</div>
                  </div>
                  <span className="hidden sm:inline-flex"><StatusPill status={status} /></span>
                  <span className="text-sm tabular-nums w-16 text-right text-text-base hidden sm:inline">{subCount}</span>
                  <span className="text-xs text-text-subtle w-20 text-right hidden md:inline">{timeAgo(form.updatedAt)}</span>
                  <div className="relative flex-shrink-0">
                    <div className="flex gap-1 quick-actions">
                      <button className="icon-btn-sm" onClick={() => handleViewSubmissions(form.id)} aria-label="View submissions">
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button className="icon-btn-sm" onClick={() => handleEditForm(form.id)} aria-label="Edit form">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="icon-btn-sm" onClick={() => handlePreviewForm(form.id)} aria-label="Preview form">
                        <ExternalLink className="h-4 w-4" />
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
                        <div className="fixed inset-0 z-10 bg-black/5" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-9 z-20 w-44 bg-surface border border-border rounded-base shadow-dropdown py-1" role="menu">
                          <MenuItem icon={Pencil} label="Rename" onClick={() => handleRenameClick(form.id)} />
                          <MenuItem icon={Copy} label="Duplicate" onClick={() => handleDuplicate(form.id)} />
                          <MenuItem icon={TrendingUp} label="Analytics" onClick={() => handleViewAnalytics(form.id)} />
                          {status === 'closed'
                            ? <MenuItem icon={Check} label="Reopen" onClick={() => handleReopenForm(form.id)} />
                            : <MenuItem icon={X} label="Close form" onClick={() => handleCloseForm(form.id)} />}
                          {folders.length > 0 && (
                            <>
                              <div className="my-1 border-t border-border" />
                              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Move to</div>
                              {folders.map(folder => (
                                <MenuItem key={folder.id} icon={Folder} label={folder.name} onClick={() => handleMoveToFolder(form.id, folder.id)} />
                              ))}
                            </>
                          )}
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
            </>
            )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredForms.map((form) => {
              const status = deriveStatus(form);
              const subCount = submissionCountFor(form.id);
              const fieldCount = form.fields?.length || 0;
              return (
                <div
                  key={form.id}
                  className="form-card group bg-surface border border-border-soft rounded-2xl hover:border-border-strong hover:shadow-card transition-all duration-200 flex flex-col"
                >
                  {/* Colored header with title + description */}
                  <div
                    className={`relative p-5 cursor-pointer rounded-t-2xl ${STATUS_META[status].headerBg}`}
                    onClick={() => handleEditForm(form.id)}
                    role="button"
                    aria-label={`Open ${form.title}`}
                  >
                    <span className="absolute top-3 right-3">
                      <StatusPill status={status} variant="tint" />
                    </span>
                    <h3 className="text-lg font-bold text-white truncate pr-20">{form.title}</h3>
                    <p className="text-sm text-white/75 line-clamp-2 mt-1">{form.description || 'No description'}</p>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Meta stats row */}
                    <div className="flex gap-4 py-3 border-t border-border-soft overflow-hidden">
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

                    {/* Quick actions + more menu */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-soft">
                      <div className="flex gap-1 quick-actions">
                        <button className="icon-btn-sm" onClick={() => handleViewSubmissions(form.id)} aria-label="View submissions">
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button className="icon-btn-sm" onClick={() => handleEditForm(form.id)} aria-label="Edit form">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="icon-btn-sm" onClick={() => handlePreviewForm(form.id)} aria-label="Preview form">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)}
                          className="p-1.5 text-text-subtle hover:text-text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[32px] min-h-[32px]"
                          aria-label="More actions"
                          aria-haspopup="menu"
                          aria-expanded={menuOpenId === form.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpenId === form.id && (
                          <>
                            <div className="fixed inset-0 z-50 bg-black/5" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-9 z-[60] w-44 bg-surface border border-border rounded-base shadow-dropdown py-1" role="menu">
                              <MenuItem icon={Pencil} label="Rename" onClick={() => handleRenameClick(form.id)} />
                              <MenuItem icon={Copy} label="Duplicate" onClick={() => handleDuplicate(form.id)} />
                              <MenuItem icon={TrendingUp} label="Analytics" onClick={() => handleViewAnalytics(form.id)} />
                              {status === 'closed'
                                ? <MenuItem icon={Check} label="Reopen" onClick={() => handleReopenForm(form.id)} />
                                : <MenuItem icon={X} label="Close form" onClick={() => handleCloseForm(form.id)} />}
                              {folders.length > 0 && (
                                <>
                                  <div className="my-1 border-t border-border" />
                                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-subtle font-semibold">Move to</div>
                                  {folders.map(folder => (
                                    <MenuItem key={folder.id} icon={Folder} label={folder.name} onClick={() => handleMoveToFolder(form.id, folder.id)} />
                                  ))}
                                </>
                              )}
                              <div className="my-1 border-t border-border" />
                              <MenuItem icon={Trash2} label="Delete" onClick={() => handleDeleteForm(form.id)} danger />
                            </div>
                          </>
                        )}
                      </div>
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
