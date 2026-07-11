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
import { useConfirm, usePrompt } from '../../components/Dialog';

// Derive a lightweight status from the form's content.
// Forms with no fields are "Draft"; anything with fields is "Published"
// unless explicitly set to "closed".
const deriveStatus = (form) => form.status || ((form.fields?.length || 0) === 0 ? 'draft' : 'published');

const STATUS_META = {
  published: { label: 'Live', badge: 'badge-success', pillClass: 'text-success', headerBg: 'bg-success', dotClass: 'bg-success' },
  draft:     { label: 'Draft', badge: 'badge-neutral', pillClass: 'text-warning', headerBg: 'bg-warning', dotClass: 'bg-warning' },
  closed:    { label: 'Closed', badge: 'badge-neutral', pillClass: 'text-muted', headerBg: 'bg-muted', dotClass: 'bg-muted' },
};

function StatusPill({ status, variant = 'solid' }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  if (variant === 'tint') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface/85 backdrop-blur ${meta.pillClass}`}>
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

export default function FormsList() {
  const navigate = useNavigate();
  const {
    forms, createNewForm, deleteForm, renameForm, setCurrentForm, loadForms,
    isLoading, submissions, setFormStatus, duplicateForm,
    folders, loadFolders, createFolder: storeCreateFolder,
    renameFolder: storeRenameFolder, deleteFolder: storeDeleteFolder,
    moveFormToFolder,
  } = useFormStore();
  const { toast, ToastMount } = useToast();
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const { promptDialog, PromptDialogMount } = usePrompt();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft' | 'closed'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'submissions' | 'alpha'
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('forms-view-mode') || 'list');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFormIds, setSelectedFormIds] = useState(new Set());
  // Rename modal state
  const [renaming, setRenaming] = useState(null); // { id, title, original }
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const renameInputRef = useRef(null);
  // Delete confirm modal state
  const [deleting, setDeleting] = useState(null); // form object pending confirmation
  const [batchDeleting, setBatchDeleting] = useState(false); // batch delete confirmation

  useEffect(() => {
    loadForms();
    loadFolders();
  }, [loadForms, loadFolders]);

  useEffect(() => { localStorage.setItem('forms-view-mode', viewMode); }, [viewMode]);
  useEffect(() => { setSelectedFormIds(new Set()); }, [selectedFolder]);

  const handleCreateForm = async () => {
    const newFormId = await createNewForm();
    if (selectedFolder) {
      await moveFormToFolder(newFormId, selectedFolder);
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

  const confirmDelete = async () => {
    if (deleting) {
      try {
        await deleteForm(deleting.id);
        toast(`"${deleting.title}" deleted.`, 'success');
      } catch (e) {
        toast(e?.message || 'Failed to delete form. Please try again.', 'error');
      }
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
    try {
      const newFormId = await duplicateForm(formId);
      if (newFormId) {
        if (form.folderId) {
          await moveFormToFolder(newFormId, form.folderId);
        }
        toast(`"${form.title}" duplicated.`, 'success');
      }
    } catch (e) {
      toast(e?.message || 'Failed to duplicate form. Please try again.', 'error');
    }
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

  const handleCreateFolder = async () => {
    const name = await promptDialog({
      title: 'Create Folder',
      placeholder: 'Folder name',
      confirmLabel: 'Create',
    });
    if (!name?.trim()) return;
    try {
      const folder = await storeCreateFolder(name.trim());
      setSelectedFolder(folder.id);
      toast(`Folder "${name.trim()}" created.`, 'success');
    } catch (e) {
      toast('Failed to create folder. Please try again.', 'error');
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    if (!newName?.trim()) return;
    try {
      await storeRenameFolder(folderId, newName.trim());
      toast(`Folder renamed to "${newName.trim()}".`, 'success');
    } catch (e) {
      toast('Failed to rename folder. Please try again.', 'error');
    }
  };

  const handleMoveToFolder = async (formId, folderId) => {
    try {
      await moveFormToFolder(formId, folderId);
    } catch (e) {
      toast('Failed to move form. Please try again.', 'error');
    }
    setMenuOpenId(null);
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const formsInFolder = forms.filter(f => f.folderId === folderId);
    if (formsInFolder.length > 0) {
      const ok = await confirmDialog({
        title: `Delete folder "${folder.name}"?`,
        message: `It contains ${formsInFolder.length} form(s) which will also be permanently deleted.`,
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!ok) return;
      formsInFolder.forEach(f => deleteForm(f.id).catch(() => {}));
    } else {
      const ok = await confirmDialog({
        title: `Delete empty folder "${folder.name}"?`,
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!ok) return;
    }
    try {
      await storeDeleteFolder(folderId);
      if (selectedFolder === folderId) setSelectedFolder(null);
      toast('Folder deleted.', 'info');
    } catch (e) {
      toast('Failed to delete folder. Please try again.', 'error');
    }
  };

  const handleBatchMove = async (folderId) => {
    for (const id of selectedFormIds) {
      try { await moveFormToFolder(id, folderId); } catch (e) { /* continue */ }
    }
    toast(`${selectedFormIds.size} form${selectedFormIds.size !== 1 ? 's' : ''} moved.`, 'success');
    setSelectedFormIds(new Set());
  };

  const handleBatchDelete = () => {
    setBatchDeleting(true);
  };

  const confirmBatchDelete = async () => {
    const count = selectedFormIds.size;
    const ids = [...selectedFormIds];
    setBatchDeleting(false);
    setSelectedFormIds(new Set());
    for (const id of ids) {
      try { await deleteForm(id); } catch (e) { /* continue on individual errors */ }
    }
    toast(`${count} form${count !== 1 ? 's' : ''} deleted.`, 'success');
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
  };

  const [draggedFormId, setDraggedFormId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const handleDragStart = (e, formId) => {
    // If dragging a form that's part of the batch selection, drag all selected
    if (selectedFormIds.has(formId) && selectedFormIds.size > 1) {
      e.dataTransfer.setData('text/plain', JSON.stringify([...selectedFormIds]));
    } else {
      e.dataTransfer.setData('text/plain', JSON.stringify([formId]));
    }
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

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    let formIds = [];
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) formIds = JSON.parse(raw);
    } catch { /* not our data */ }
    // Fallback to single draggedFormId if dataTransfer parsing failed
    if (formIds.length === 0 && draggedFormId) formIds = [draggedFormId];
    if (formIds.length > 0) {
      await Promise.all(formIds.map(id => moveFormToFolder(id, folderId)));
      toast(`${formIds.length} form${formIds.length !== 1 ? 's' : ''} moved.`, 'success');
      setSelectedFormIds(new Set());
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
    const counts = {};
    folders.forEach(f => { counts[f.id] = 0; });
    forms.forEach(f => {
      const fid = f.folderId;
      if (fid && counts[fid] !== undefined) counts[fid]++;
    });
    return counts;
  }, [forms, folders]);

  const filteredForms = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    let list = forms.filter((form) => {
      const matchesSearch = !searchLower ||
        form.title.toLowerCase().includes(searchLower) ||
        (form.description || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || deriveStatus(form) === statusFilter;
      const matchesFolder = selectedFolder === null
        ? !form.folderId
        : form.folderId === selectedFolder;
      return matchesSearch && matchesStatus && matchesFolder;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'alpha') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'submissions') return submissionCountFor(b.id) - submissionCountFor(a.id);
      // recent: default, but push empty untitled drafts to the bottom so live work surfaces first
      const aEmpty = (a.fields?.length || 0) === 0 && (a.title || '').toLowerCase().startsWith('untitled');
      const bEmpty = (b.fields?.length || 0) === 0 && (b.title || '').toLowerCase().startsWith('untitled');
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms, searchQuery, statusFilter, sortBy, submissions, selectedFolder, folders]);

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
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
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:bg-surface-raised'}`}
                aria-pressed={statusFilter === id}
              >
                {label}
                <span className={`text-xs ${statusFilter === id ? 'text-primary-foreground/70' : 'text-subtle'}`}>{count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-none sm:w-56 lg:w-64 sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body placeholder:text-muted min-h-[44px]"
              aria-label="Search forms"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-text-base text-primary-foreground' : 'text-muted hover:bg-surface-raised'}`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-text-base text-primary-foreground' : 'text-muted hover:bg-surface-raised'}`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* New form — always visible regardless of folder contents */}
          <button
            onClick={handleCreateForm}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
            aria-label="Create new form"
          >
            <Plus className="h-4 w-4" />
            New form
          </button>
        </div>

        {/* Mobile / grid folder selector */}
        {folders.length > 0 && (
          <div className={`mb-4 ${viewMode === 'list' ? 'md:hidden' : ''}`}>
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px] cursor-pointer"
              aria-label="Select folder"
            >
              <option value="">All Forms (root)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({folderCounts[f.id] || 0})</option>
              ))}
            </select>
          </div>
        )}

        {/* Forms grid/list */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-body text-muted">Loading forms...</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className={`flex gap-6`}>
            {/* Folder sidebar — always visible so users can create first folder */}
            <div className="w-52 flex-shrink-0 hidden md:block">
              <div className="sticky top-20">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Folders</span>
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 text-subtle hover:text-primary hover:bg-primary-light rounded transition-colors"
                    aria-label="New folder"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  {folders.length === 0 && (
                    <span className="text-xs text-muted px-3 py-2">No folders yet. Click + to create one.</span>
                  )}
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
                        onDoubleClick={async () => {
                          const newName = await promptDialog({
                            title: 'Rename folder:',
                            defaultValue: folder.name,
                            confirmLabel: 'Rename',
                          });
                          if (newName?.trim() && newName.trim() !== folder.name) handleRenameFolder(folder.id, newName);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${selectedFolder === folder.id ? 'bg-primary-light text-primary' : 'text-muted hover:bg-surface-raised'} ${dragOverFolder === folder.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                      >
                        <Folder className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-subtle tabular-nums">{folderCounts[folder.id] || 0}</span>
                      </button>
                      <div className="absolute right-7 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const newName = await promptDialog({
                              title: 'Rename folder:',
                              defaultValue: folder.name,
                              confirmLabel: 'Rename',
                            });
                            if (newName?.trim() && newName.trim() !== folder.name) handleRenameFolder(folder.id, newName);
                          }}
                          className="p-1 text-subtle hover:text-primary rounded"
                          aria-label={`Rename folder ${folder.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="p-1 text-subtle hover:text-danger rounded"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form list */}
            <div className="flex-1 flex flex-col gap-2">
            {/* Batch action bar (always visible when forms exist) */}
            {filteredForms.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-light border border-primary/20">
                <input
                  type="checkbox"
                  checked={selectedFormIds.size === filteredForms.length && filteredForms.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                  aria-label="Select all forms"
                />
                <span className={`text-sm font-medium ${selectedFormIds.size > 0 ? 'font-semibold text-primary' : 'text-subtle'}`}>
                  {selectedFormIds.size > 0 ? `${selectedFormIds.size} of ${filteredForms.length} selected` : 'Select all'}
                </span>
                <div className={`flex items-center gap-1.5 ${selectedFormIds.size > 0 ? '' : 'invisible'}`}>
                  {folders.length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) handleBatchMove(e.target.value); }}
                      className="px-3 py-1.5 bg-surface border border-border rounded-base text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] cursor-pointer"
                    >
                      <option value="" disabled>Move to folder…</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted">Create a folder first</span>
                  )}
                </div>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedFormIds.size === 0}
                  className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger text-primary-foreground rounded-base text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] ${selectedFormIds.size > 0 ? '' : 'invisible'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  className={`text-sm text-muted hover:text-text-base transition-colors ${selectedFormIds.size > 0 ? '' : 'invisible'}`}
                >
                  Clear
                </button>
              </div>
            )}
            {filteredForms.length > 0 && folders.length > 0 && (
              <div className="text-xs text-subtle px-1 pb-1 hidden md:block">
                Tip: Drag a form onto a folder to move it.
              </div>
            )}
            {filteredForms.length === 0 && forms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-subtle mx-auto mb-3" />
                <p className="text-body text-muted mb-4">No forms yet. Create your first form to get started.</p>
                <button
                  onClick={handleCreateForm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create your first form
                </button>
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-subtle mx-auto mb-3" />
                <p className="text-body text-muted mb-4">
                  {selectedFolder ? 'No forms in this folder yet.' : 'No forms here yet.'}
                </p>
                <button
                  onClick={handleCreateForm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {selectedFolder ? 'Create form in this folder' : 'Create form'}
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
                  className={`form-card group flex items-center gap-4 p-3 rounded-xl bg-surface border hover:border-border-strong hover:shadow-card-sm transition-all ${selectedFormIds.has(form.id) ? 'border-primary bg-primary-light/30' : 'border-border-soft'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFormIds.has(form.id)}
                    onChange={() => toggleSelect(form.id)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                    aria-label={`Select ${form.title}`}
                  />
                  <div
                    onClick={() => handleEditForm(form.id)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-base truncate">{form.title}</h3>
                      <StatusPill status={status} variant="tint" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{subCount} submission{subCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Updated {timeAgo(form.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewSubmissions(form.id)}
                      className="p-1.5 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px]"
                      aria-label="View submissions"
                    >
                      <Inbox className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleViewAnalytics(form.id)}
                      className="p-1.5 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px]"
                      aria-label="View analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePreviewForm(form.id)}
                      className="p-1.5 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px]"
                      aria-label="Preview form"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)}
                      className="p-1.5 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px]"
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
                              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-subtle font-semibold">Move to</div>
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
            </>
            )}
            {/* In-list "Create new form" row — mirrors the grid view's create card */}
            {filteredForms.length > 0 && (
              <button
                onClick={handleCreateForm}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30 hover:text-primary text-muted transition-all text-left min-h-[72px]"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Create new form</div>
                  <div className="text-xs text-muted">Start from scratch or a template</div>
                </div>
              </button>
            )}
            </div>
          </div>
        ) : filteredForms.length === 0 && forms.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-subtle mx-auto mb-3" />
            <p className="text-body text-muted mb-4">No forms yet. Create your first form to get started.</p>
            <button
              onClick={handleCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create your first form
            </button>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-subtle mx-auto mb-3" />
            <p className="text-body text-muted mb-4">
              {selectedFolder ? 'No forms in this folder yet.' : 'No forms here yet.'}
            </p>
            <button
              onClick={handleCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              {selectedFolder ? 'Create form in this folder' : 'Create form'}
            </button>
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredForms.map((form) => {
              const status = deriveStatus(form);
              const subCount = submissionCountFor(form.id);
              const fieldCount = form.fields?.length || 0;
              return (
                <div
                  key={form.id}
                  className="group relative rounded-2xl bg-surface border border-border-soft hover:border-border-strong hover:shadow-card-sm transition-all overflow-hidden"
                >
                  {/* Status header */}
                  <div className={`h-2 ${STATUS_META[status]?.headerBg || 'bg-muted'}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-base truncate mb-1">{form.title}</h3>
                        <StatusPill status={status} />
                      </div>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)}
                        className="p-1.5 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px]"
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
                                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-subtle font-semibold">Move to</div>
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
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Inbox className="h-3.5 w-3.5" />
                        <span>{subCount} submission{subCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{fieldCount} field{fieldCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Updated {timeAgo(form.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditForm(form.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-xs font-medium transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleViewSubmissions(form.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-raised border border-border rounded-lg hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-xs font-medium transition-colors"
                      >
                        <Inbox className="h-3.5 w-3.5" />
                        Submissions
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* In-grid "Create new form" card */}
            <button
              onClick={handleCreateForm}
              className="min-h-[280px] rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/50 hover:text-primary text-muted transition-all flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="text-base font-bold">Create new form</div>
                <div className="text-sm text-muted">Start from scratch or a template</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Rename modal */}
      {renaming && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-dialog-title"
          onClick={() => !isRenaming && setRenaming(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !isRenaming) setRenaming(null); }}
        >
          <form
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-raised border border-border rounded-2xl shadow-2xl p-6 animate-[fadeInScale_0.15s_ease-out]"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="rename-dialog-title" className="text-lg font-bold text-base">Rename form</h2>
                <p className="text-small text-muted mt-0.5">The share link slug will update automatically.</p>
              </div>
              <button
                type="button"
                onClick={() => !isRenaming && setRenaming(null)}
                className="p-1.5 text-subtle hover:text-muted hover:bg-surface rounded focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px]"
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
                className="px-4 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-body transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRenaming || !renaming.title.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRenaming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch delete confirm modal */}
      {batchDeleting && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-delete-dialog-title"
          onClick={() => setBatchDeleting(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setBatchDeleting(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-raised border border-border rounded-2xl shadow-2xl p-6 animate-[fadeInScale_0.15s_ease-out]"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-light flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div className="min-w-0">
                <h2 id="batch-delete-dialog-title" className="text-lg font-bold text-base">Delete {selectedFormIds.size} form{selectedFormIds.size !== 1 ? 's' : ''}?</h2>
                <p className="text-body text-muted mt-1">
                  {selectedFormIds.size} form{selectedFormIds.size !== 1 ? 's' : ''} and all of their submissions will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBatchDeleting(false)}
                className="px-4 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-body transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatchDelete}
                autoFocus
                className="px-4 py-2 bg-danger text-primary-foreground rounded-base hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-h-[44px] text-body font-medium transition-opacity"
              >
                Delete {selectedFormIds.size} form{selectedFormIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setDeleting(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setDeleting(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface-raised border border-border rounded-2xl shadow-2xl p-6 animate-[fadeInScale_0.15s_ease-out]"
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
                className="px-4 py-2 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-body transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                autoFocus
                className="px-4 py-2 bg-danger text-primary-foreground rounded-base hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1 min-h-[44px] text-body font-medium transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastMount}
      {ConfirmDialogMount}
      {PromptDialogMount}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="menuitem"
      tabIndex={0}
      className={`w-full flex items-center gap-2 px-3 py-2 text-small text-left hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset transition-colors ${danger ? 'text-danger hover:bg-danger-light' : 'text-base'}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
