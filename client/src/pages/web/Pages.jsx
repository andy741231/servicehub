import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ─── Focus trap hook ────────────────────────────────────────────────────────

function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    // Handle Tab key to trap focus
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Cleanup: restore focus when modal closes
    return () => {
      container.removeEventListener('keydown', handleTab);
      previousActiveElementRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}
import {
  Plus, ExternalLink, Trash2, Pencil, Globe, Link as LinkIcon,
  X, Check, AlertCircle, GripVertical, FolderPlus, Settings
} from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import { useConfirm } from '../../components/Dialog';
import { useToast } from '../../components/Toast';

const RESERVED_SLUGS = ['hub-admin', 'form', 'f', 'forms'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─────────────────────────────────────────────
// Add / Edit modal (shared)
// ─────────────────────────────────────────────
function ItemModal({ onClose, onSave, initial = null, parentId = null, allPages = [] }) {
  const isEdit = !!initial;
  const containerRef = useFocusTrap(true);
  const [type,       setType]       = useState(initial?.href ? 'link' : 'page');
  const [title,      setTitle]      = useState(initial?.title || '');
  const [slug,       setSlug]       = useState(initial?.slug?.startsWith('__link_') ? '' : (initial?.slug || ''));
  const [slugManual, setSlugManual] = useState(isEdit);
  const [href,       setHref]       = useState(initial?.href || '');
  const [navLabel,   setNavLabel]   = useState(initial?.navLabel || '');
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [isReserved, setIsReserved] = useState(initial?.isReserved ?? false);
  const [hideFromNav, setHideFromNav] = useState(initial?.hideFromNav ?? false);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  // Update isReserved when slug changes
  useEffect(() => {
    if (type === 'page' && !slugManual) {
      setIsReserved(RESERVED_SLUGS.includes(slugify(slug)));
    }
  }, [slug, slugManual, type]);

  const handleTitleChange = (val) => {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
    if (!navLabel)   setNavLabel(val);
  };

  const handleSlugChange = (val) => {
    setSlug(slugify(val));
    setSlugManual(true);
    // Auto-set reserved flag if slug matches reserved paths
    setIsReserved(RESERVED_SLUGS.includes(slugify(val)));
  };

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) return setError('Label is required.');
    if (type === 'page') {
      if (!slug.trim()) return setError('URL path is required.');
    }
    if (type === 'link' && !href.trim()) return setError('URL is required.');
    setSaving(true);
    try {
      await onSave({
        type,
        title,
        slug:       type === 'page' ? slug : `__link_${Date.now()}`,
        href:       type === 'link' ? href : null,
        navLabel:   navLabel || title,
        isPublished,
        parentId,
        isReserved,
        hideFromNav,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <div ref={containerRef} className="bg-surface rounded-2xl shadow-2xl w-[calc(100vw-2rem)] max-w-lg animate-[fadeInScale_0.15s_ease-out]" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <h3 id="item-modal-title" className="font-semibold text-text-base">
            {isEdit ? 'Edit Item' : parentId ? 'Add Sub-menu Item' : 'Add Navigation Item'}
          </h3>
          <button onClick={onClose} className="p-3 min-w-[44px] min-h-[44px] hover:bg-surface-raised rounded" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Type toggle — only on add, or if editing existing */}
          {!isEdit && (
            <div className="flex gap-2">
              {[{ id: 'page', label: 'Page', Icon: Globe }, { id: 'link', label: 'Link', Icon: LinkIcon }].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-base border text-sm font-medium transition-colors ${
                    type === id ? 'bg-primary-light border-primary-light text-primary' : 'border-border text-muted hover:bg-surface-raised'
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          )}

          {/* Label */}
          <div>
            <label className="field-label">Navigation Label</label>
            <input
              type="text"
              value={navLabel || title}
              onChange={e => { setNavLabel(e.target.value); setTitle(e.target.value); if (!slugManual) setSlug(slugify(e.target.value)); }}
              className="input-field"
              placeholder="About Us"
              autoFocus
            />
          </div>

          {type === 'page' ? (
            <div>
              <label className="field-label">URL Path</label>
              <div className="flex items-center border border-border-strong rounded-base overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <span className="px-3 py-2 bg-surface-raised text-subtle text-sm border-r border-border-strong select-none">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  placeholder="about-us"
                />
              </div>
              <p className="text-xs text-subtle mt-1 font-mono">/{slug || '…'}</p>
            </div>
          ) : (
            <div>
              <label className="field-label">URL</label>
              <input
                type="url"
                value={href}
                onChange={e => setHref(e.target.value)}
                className="input-field"
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Published toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-base">Published</label>
              <button
                onClick={() => setIsPublished(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isPublished ? 'bg-primary' : 'bg-surface-tertiary'}`}
                aria-label={isPublished ? 'Unpublish' : 'Publish'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${isPublished ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Hide from main nav toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-base">Hide from Main Nav</label>
              <button
                onClick={() => setHideFromNav(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${hideFromNav ? 'bg-primary' : 'bg-surface-tertiary'}`}
                aria-label={hideFromNav ? 'Show in nav' : 'Hide from nav'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${hideFromNav ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Reserved path toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-text-base">Reserved Path</label>
                <span className="text-xs text-subtle">(System use)</span>
              </div>
              <button
                onClick={() => setIsReserved(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isReserved ? 'bg-warning' : 'bg-surface-tertiary'}`}
                aria-label={isReserved ? 'Unmark as reserved' : 'Mark as reserved'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${isReserved ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Reserved path warning */}
          {type === 'page' && isReserved && (
            <div className="flex items-start gap-2 bg-warning-light border border-warning-light rounded-base p-3">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning">
                <strong>Reserved path:</strong> This path is reserved for system use and will be shown in a separate group.
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-danger-light px-3 py-2 rounded-base">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Single nav item row (top-level or child)
// ─────────────────────────────────────────────
function NavRow({ page, depth = 0, dragHandleProps, onEdit, onDelete, onAddChild, onTogglePublished, onToggleReserved, isLink }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 group rounded-card px-3 py-2.5 hover:bg-surface-raised/80 transition-colors border border-transparent hover:border-border-soft ${depth > 0 ? 'ml-4 sm:ml-7' : ''}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Drag handle — only this element triggers drag */}
        <div
          {...dragHandleProps}
          className="cursor-grab flex-shrink-0 p-1 -ml-1 rounded-base sm:ml-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 text-surface-tertiary group-hover:text-subtle transition-colors" />
        </div>

        {/* Icon */}
        <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-base flex items-center justify-center flex-shrink-0 shadow-sm ${isLink ? 'bg-info-light ring-1 ring-info-light' : 'bg-primary-light ring-1 ring-primary-light'}`}>
          {isLink
            ? <LinkIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-info" />
            : <Globe    className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-primary" />}
        </div>

        {/* Label + path */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-base">{page.navLabel || page.title}</span>
            {!isLink && (
              <>
                {/* Published toggle badge */}
                <button
                  onClick={() => onTogglePublished(page)}
                  title={page.isPublished ? 'Click to unpublish (set to Draft)' : 'Click to publish'}
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer hover:ring-2 hover:ring-offset-1 ${
                    page.isPublished
                      ? 'bg-success-light text-success hover:bg-success/20 hover:ring-success'
                      : 'bg-surface-raised text-muted hover:bg-surface-tertiary hover:ring-border-strong'
                  }`}
                >
                  {page.isPublished ? 'Published' : 'Draft'}
                </button>
                {/* Reserved toggle badge */}
                <button
                  onClick={() => onToggleReserved(page)}
                  title={page.isReserved ? 'Click to remove Reserved flag (moves to Pages group)' : 'Click to mark as Reserved (moves to Reserved group)'}
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer hover:ring-2 hover:ring-offset-1 ${
                    page.isReserved
                      ? 'bg-warning-light text-warning hover:bg-warning/20 hover:ring-warning'
                      : 'bg-surface-raised text-subtle border border-dashed border-border-strong hover:bg-warning-light hover:text-warning hover:border-warning hover:ring-warning'
                  }`}
                >
                  {page.isReserved ? 'Reserved' : 'Set reserved'}
                </button>
                {page.hideFromNav && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-surface-raised text-muted">Hidden</span>
                )}
              </>
            )}
          </div>
          <span className="text-xs text-subtle font-mono leading-tight break-all">
            {isLink ? (page.href || 'external link') : `/${page.slug}`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-12 sm:ml-0">
        {/* Primary CTA buttons */}
        <div className="flex items-center gap-1.5">
          {!isLink && (
            <>
              <Link
                to={`/hub-admin/web/editor/${page.slug}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-base hover:bg-primary-hover active:scale-95 transition-all shadow-sm min-h-[36px]"
                title="Open in page editor"
              >
                <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
              <a
                href={page.slug === 'home' ? '/' : `/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-muted bg-surface border border-border rounded-base hover:bg-surface-raised hover:border-border-strong active:scale-95 transition-all shadow-sm min-h-[36px]"
                title="View live page"
              >
                <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">View</span>
              </a>
            </>
          )}
        </div>

        {/* Secondary icon actions — always visible on mobile, hover on desktop */}
        <div className="flex items-center gap-0.5 ml-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {depth === 0 && (
            <button
              onClick={() => onAddChild(page.id)}
              className="p-2 sm:p-1.5 hover:bg-primary-light text-primary hover:text-primary rounded-base transition-colors min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              aria-label="Add sub-menu item"
              title="Add sub-menu item"
            >
              <FolderPlus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(page)}
            className="p-2 sm:p-1.5 hover:bg-surface-raised text-subtle hover:text-text-base rounded-base transition-colors min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="Page settings"
            title="Page settings"
          >
            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => onDelete(page.id)}
            className="p-2 sm:p-1.5 hover:bg-danger-light text-subtle hover:text-danger rounded-base transition-colors min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Pages component
// ─────────────────────────────────────────────
export default function Pages() {
  const [pages,    setPages]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | { mode: 'add'|'edit', page?, parentId? }

  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const { toast, ToastMount } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/web/pages');
      // Auto-set isReserved flag based on slug for existing pages
      const pagesWithReserved = Array.isArray(data) ? data.map(page => ({
        ...page,
        isReserved: page.isReserved || RESERVED_SLUGS.includes(page.slug)
      })) : [];
      setPages(pagesWithReserved);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async ({ type, title, slug, href, navLabel, isPublished, parentId, isReserved, hideFromNav }) => {
    if (modal?.mode === 'edit' && modal.page) {
      await api.patch(`/web/pages/${modal.page.id}`, { title, navLabel, slug, isPublished, href, isReserved, hideFromNav });
      toast('Item updated.');
    } else {
      await api.post('/web/pages', {
        slug,
        title,
        navLabel: navLabel || title,
        isPublished,
        href: href || null,
        parentId: parentId || null,
        isReserved,
        hideFromNav,
      });
      toast('Item added.');
    }
    await load();
  };

  // Optimistic inline toggles — patch single field, re-fetch to re-group
  const handleQuickToggle = async (page, field) => {
    const newVal = !page[field];
    // Optimistic update
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, [field]: newVal } : p));
    try {
      await api.patch(`/web/pages/${page.id}`, { [field]: newVal });
      const label = field === 'isPublished'
        ? (newVal ? 'Page published.' : 'Page set to draft — no longer public.')
        : (newVal ? 'Moved to Reserved group.' : 'Moved to Pages group.');
      toast(label);
      await load(); // re-fetch so grouping re-computes from server truth
    } catch (e) {
      console.error(e);
      toast('Failed to update.', 'error');
      await load(); // revert on error
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete this item?',
      message: 'Any sub-menu items under it will also be removed. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/web/pages/${id}`);
    toast('Item deleted.', 'error');
    await load();
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Only allow reordering within the same list (same parent)
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const listId = source.droppableId;

    // ── Child sub-menu reorder ───────────────────────────────────────────────
    if (listId.startsWith('children-')) {
      const parentId = listId.replace('children-', '');
      const siblings = pages.filter(p => p.parentId === parentId);
      const newOrder = Array.from(siblings);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);

      const reordered = newOrder.map((p, i) => ({ ...p, order: i }));
      setPages(prev => [
        ...prev.filter(p => p.parentId !== parentId),
        ...reordered,
      ]);

      try {
        await api.put('/web/pages/reorder', {
          items: reordered.map((p, i) => ({ id: p.id, order: i })),
        });
        toast('Order updated.');
      } catch (e) {
        console.error(e);
        toast('Failed to update order.', 'error');
        await load();
      }
      return;
    }

    // ── Top-level reorder ────────────────────────────────────────────────────
    const isRegular = listId === 'regular';
    const filteredList = isRegular
      ? topLevel.filter(p => !p.isReserved)
      : topLevel.filter(p => p.isReserved);

    const newOrder = Array.from(filteredList);
    const [moved] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, moved);

    const reorderedPages = newOrder.map((page, index) => ({ ...page, order: index }));
    const otherList = isRegular
      ? topLevel.filter(p => p.isReserved)
      : topLevel.filter(p => !p.isReserved);

    // Keep children intact — only replace top-level entries
    const childPages = pages.filter(p => p.parentId);
    setPages([...reorderedPages, ...otherList, ...childPages]);

    try {
      await api.put('/web/pages/reorder', {
        items: reorderedPages.map((p, i) => ({ id: p.id, order: i })),
      });
      toast('Order updated.');
    } catch (e) {
      console.error(e);
      toast('Failed to update order.', 'error');
      await load();
    }
  };

  // Build tree: top-level items + their children
  const topLevel = pages.filter(p => !p.parentId);
  const childrenOf = (id) => pages.filter(p => p.parentId === id);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <PageHeader>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </PageHeader>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-raised rounded-card animate-pulse" />)}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="empty-state">
          <Globe className="w-12 h-12 text-subtle mx-auto mb-3" />
          <p className="text-muted font-semibold">No navigation items yet</p>
          <p className="text-subtle text-sm mt-1">Add a page or link to build your nav bar.</p>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="mt-4 btn-primary"
          >
            <Plus className="w-4 h-4" /> Add your first item
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-5">
            {/* Regular Pages */}
            {topLevel.filter(p => !p.isReserved).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Pages</h3>
                  <div className="flex-1 h-px bg-surface-raised" />
                </div>
                <Droppable droppableId="regular">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1 bg-surface border border-border rounded-card p-2 shadow-sm transition-colors ${snapshot.isDraggingOver ? 'bg-primary-light/50 border-primary-light' : ''}`}
                    >
                      {topLevel.filter(p => !p.isReserved).map((page, index) => {
                        const kids = childrenOf(page.id);
                        return (
                          <Draggable key={page.id} draggableId={page.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                {/* Parent row — drag handle passed in so only the grip triggers drag */}
                                <NavRow
                                  page={page}
                                  depth={0}
                                  isLink={page.slug?.startsWith('__link_')}
                                  dragHandleProps={provided.dragHandleProps}
                                  onEdit={p => setModal({ mode: 'edit', page: p })}
                                  onDelete={handleDelete}
                                  onAddChild={parentId => setModal({ mode: 'add', parentId })}
                                  onTogglePublished={p => handleQuickToggle(p, 'isPublished')}
                                  onToggleReserved={p => handleQuickToggle(p, 'isReserved')}
                                />

                                {/* Children — rendered inside the Draggable so they stay with the parent row,
                                    but each child has its own Draggable for independent reordering */}
                                {kids.length > 0 && (
                                  <Droppable droppableId={`children-${page.id}`}>
                                    {(cp, cs) => (
                                      <div
                                        ref={cp.innerRef}
                                        {...cp.droppableProps}
                                        className={`mt-0.5 border-l-2 border-border-soft ml-4 sm:ml-[30px] rounded-b-xl transition-colors ${cs.isDraggingOver ? 'border-primary-light bg-primary-light/30' : ''}`}
                                      >
                                        {kids.map((child, ci) => (
                                          <Draggable key={child.id} draggableId={child.id} index={ci}>
                                            {(cdp, cds) => (
                                              <div
                                                ref={cdp.innerRef}
                                                {...cdp.draggableProps}
                                                className={`${cds.isDragging ? 'opacity-50' : ''}`}
                                              >
                                                <NavRow
                                                  page={child}
                                                  depth={1}
                                                  isLink={child.slug?.startsWith('__link_')}
                                                  dragHandleProps={cdp.dragHandleProps}
                                                  onEdit={p => setModal({ mode: 'edit', page: p })}
                                                  onDelete={handleDelete}
                                                  onAddChild={parentId => setModal({ mode: 'add', parentId })}
                                                  onTogglePublished={p => handleQuickToggle(p, 'isPublished')}
                                                  onToggleReserved={p => handleQuickToggle(p, 'isReserved')}
                                                />
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {cp.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}

            {/* Reserved Pages */}
            {topLevel.filter(p => p.isReserved).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <AlertCircle className="w-3.5 h-3.5 text-warning" />
                  <h3 className="text-xs font-semibold text-warning uppercase tracking-wider">Reserved Paths</h3>
                  <div className="flex-1 h-px bg-warning-light" />
                </div>
                <Droppable droppableId="reserved">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1 bg-warning-light/60 border border-warning-light rounded-card p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-warning-light border-warning' : ''}`}
                    >
                      {topLevel.filter(p => p.isReserved).map((page, index) => {
                        const kids = childrenOf(page.id);
                        return (
                          <Draggable key={page.id} draggableId={page.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <NavRow
                                  page={page}
                                  depth={0}
                                  isLink={page.slug?.startsWith('__link_')}
                                  dragHandleProps={provided.dragHandleProps}
                                  onEdit={p => setModal({ mode: 'edit', page: p })}
                                  onDelete={handleDelete}
                                  onAddChild={parentId => setModal({ mode: 'add', parentId })}
                                  onTogglePublished={p => handleQuickToggle(p, 'isPublished')}
                                  onToggleReserved={p => handleQuickToggle(p, 'isReserved')}
                                />
                                {kids.length > 0 && (
                                  <Droppable droppableId={`children-${page.id}`}>
                                    {(cp, cs) => (
                                      <div
                                        ref={cp.innerRef}
                                        {...cp.droppableProps}
                                        className={`mt-0.5 border-l-2 border-warning-light ml-4 sm:ml-[30px] rounded-b-xl transition-colors ${cs.isDraggingOver ? 'border-warning bg-warning-light/60' : ''}`}
                                      >
                                        {kids.map((child, ci) => (
                                          <Draggable key={child.id} draggableId={child.id} index={ci}>
                                            {(cdp, cds) => (
                                              <div
                                                ref={cdp.innerRef}
                                                {...cdp.draggableProps}
                                                className={`${cds.isDragging ? 'opacity-50' : ''}`}
                                              >
                                                <NavRow
                                                  page={child}
                                                  depth={1}
                                                  isLink={child.slug?.startsWith('__link_')}
                                                  dragHandleProps={cdp.dragHandleProps}
                                                  onEdit={p => setModal({ mode: 'edit', page: p })}
                                                  onDelete={handleDelete}
                                                  onAddChild={parentId => setModal({ mode: 'add', parentId })}
                                                  onTogglePublished={p => handleQuickToggle(p, 'isPublished')}
                                                  onToggleReserved={p => handleQuickToggle(p, 'isReserved')}
                                                />
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {cp.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <p className="mt-2 text-xs text-warning/80 px-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Reserved for system use — may conflict with built-in routes.
                </p>
              </div>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Footer hint */}
      {!loading && topLevel.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-subtle px-1">
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5" /> Drag rows to reorder
          </span>
          <span className="flex items-center gap-1.5">
            <FolderPlus className="w-3.5 h-3.5" /> Folder icon adds a sub-menu
          </span>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ItemModal
          onClose={() => setModal(null)}
          onSave={handleSave}
          initial={modal.mode === 'edit' ? modal.page : null}
          parentId={modal.parentId || null}
          allPages={pages}
        />
      )}

      {/* Shared UI primitives */}
      {ConfirmDialogMount}
      {ToastMount}
    </div>
  );
}
