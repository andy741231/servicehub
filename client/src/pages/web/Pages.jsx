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
  X, Check, AlertCircle, ChevronRight, ChevronDown, GripVertical, FolderPlus, Settings
} from 'lucide-react';
import api from '../../utils/api';
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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={containerRef} className="bg-white rounded-xl shadow-2xl w-[440px]" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {isEdit ? 'Edit Item' : parentId ? 'Add Sub-menu Item' : 'Add Navigation Item'}
          </h3>
          <button onClick={onClose} className="p-3 min-w-[44px] min-h-[44px] hover:bg-gray-100 rounded" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type toggle — only on add, or if editing existing */}
          {!isEdit && (
            <div className="flex gap-2">
              {[{ id: 'page', label: 'Page', Icon: Globe }, { id: 'link', label: 'Link', Icon: LinkIcon }].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    type === id ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          )}

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Navigation Label</label>
            <input
              type="text"
              value={navLabel || title}
              onChange={e => { setNavLabel(e.target.value); setTitle(e.target.value); if (!slugManual) setSlug(slugify(e.target.value)); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="About Us"
              autoFocus
            />
          </div>

          {type === 'page' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Path</label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <span className="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-r border-gray-300 select-none">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  placeholder="about-us"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 font-mono">/{slug || '…'}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={href}
                onChange={e => setHref(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* Published toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Published</label>
              <button
                onClick={() => setIsPublished(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isPublished ? 'bg-blue-500' : 'bg-gray-300'}`}
                aria-label={isPublished ? 'Unpublish' : 'Publish'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublished ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Hide from main nav toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Hide from Main Nav</label>
              <button
                onClick={() => setHideFromNav(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${hideFromNav ? 'bg-blue-500' : 'bg-gray-300'}`}
                aria-label={hideFromNav ? 'Show in nav' : 'Hide from nav'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hideFromNav ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Reserved path toggle (pages only) */}
          {type === 'page' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Reserved Path</label>
                <span className="text-xs text-gray-400">(System use)</span>
              </div>
              <button
                onClick={() => setIsReserved(p => !p)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isReserved ? 'bg-amber-500' : 'bg-gray-300'}`}
                aria-label={isReserved ? 'Unmark as reserved' : 'Mark as reserved'}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isReserved ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          )}

          {/* Reserved path warning */}
          {type === 'page' && isReserved && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Reserved path:</strong> This path is reserved for system use and will be shown in a separate group.
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 active:bg-gray-200 active:scale-95 transition-transform rounded-lg">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2"
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
function NavRow({ page, depth = 0, children, onEdit, onDelete, onAddChild, isLink }) {
  const [open, setOpen] = useState(true);
  const hasChildren = children?.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 group rounded-xl px-3 py-2.5 hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 ${depth > 0 ? 'ml-7' : ''}`}
      >
        {/* Drag handle */}
        <GripVertical className="w-4 h-4 text-gray-200 group-hover:text-gray-400 cursor-grab flex-shrink-0 transition-colors" />

        {/* Expand chevron */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 rounded transition-colors ${hasChildren ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100' : 'invisible'}`}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${isLink ? 'bg-purple-50 ring-1 ring-purple-100' : 'bg-blue-50 ring-1 ring-blue-100'}`}>
          {isLink
            ? <LinkIcon className="w-3.5 h-3.5 text-purple-500" />
            : <Globe    className="w-3.5 h-3.5 text-blue-500" />}
        </div>

        {/* Label + path */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{page.navLabel || page.title}</span>
            {!isLink && (
              <>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${page.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {page.isPublished ? 'Published' : 'Draft'}
                </span>
                {page.isReserved && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Reserved</span>
                )}
                {page.hideFromNav && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Hidden</span>
                )}
              </>
            )}
          </div>
          <span className="text-xs text-gray-400 font-mono leading-tight">
            {isLink ? (page.href || 'external link') : `/${page.slug}`}
          </span>
        </div>

        {/* Primary CTA buttons — always visible */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isLink && (
            <>
              <Link
                to={`/hub-admin/web/editor/${page.slug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                title="Open in page editor"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Link>
              <a
                href={page.slug === 'home' ? '/' : `/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shadow-sm"
                title="View live page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View
              </a>
            </>
          )}

          {/* Secondary icon actions — on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            {depth === 0 && (
              <button
                onClick={() => onAddChild(page.id)}
                className="p-1.5 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded-lg transition-colors"
                aria-label="Add sub-menu item"
                title="Add sub-menu item"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(page)}
              className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
              aria-label="Page settings"
              title="Page settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(page.id)}
              className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="mt-0.5 space-y-0.5 border-l-2 border-gray-100 ml-[30px]">
          {children.map(child => (
            <NavRow
              key={child.id}
              page={child}
              depth={depth + 1}
              isLink={child.slug?.startsWith('__link_')}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
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
    const { source, destination, draggableId } = result;
    
    // Only allow reordering within the same list (same parent)
    if (source.droppableId !== destination.droppableId) return;

    const listId = source.droppableId;
    const isRegular = listId === 'regular';
    const filteredList = isRegular 
      ? topLevel.filter(p => !p.isReserved)
      : topLevel.filter(p => p.isReserved);

    const newOrder = Array.from(filteredList);
    const [moved] = newOrder.splice(source.index, 1);
    newOrder.splice(destination.index, 0, moved);

    // Update local state optimistically
    const reorderedPages = newOrder.map((page, index) => ({
      ...page,
      order: index,
    }));

    // Merge back with the other list
    const otherList = isRegular
      ? topLevel.filter(p => p.isReserved)
      : topLevel.filter(p => !p.isReserved);
    
    setPages([...reorderedPages, ...otherList]);

    // Send to API
    try {
      await api.put('/web/pages/reorder', {
        items: reorderedPages.map((p, i) => ({ id: p.id, order: i })),
      });
      toast('Order updated.');
    } catch (e) {
      console.error(e);
      toast('Failed to update order.', 'error');
      await load(); // Revert on error
    }
  };

  // Build tree: top-level items + their children
  const topLevel = pages.filter(p => !p.parentId);
  const childrenOf = (id) => pages.filter(p => p.parentId === id);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages & Navigation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag to reorder · Items appear in the order shown on the public site.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Nav preview bar */}
      {!loading && topLevel.filter(p => !p.hideFromNav).length > 0 && (
        <div className="mb-6 bg-gray-900 rounded-xl px-5 py-3 flex items-center gap-1 overflow-x-auto shadow-inner">
          <span className="text-white text-sm font-bold mr-4 flex-shrink-0 opacity-70">Preview</span>
          {topLevel.filter(p => !p.hideFromNav).map(page => {
            const kids = childrenOf(page.id);
            return (
              <div key={page.id} className="relative group/nav flex-shrink-0">
                <span className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-md hover:bg-white/10 cursor-default flex items-center gap-1 transition-colors">
                  {page.navLabel || page.title}
                  {kids.length > 0 && <ChevronDown className="w-3 h-3 opacity-60" />}
                </span>
                {kids.length > 0 && (
                  <div className="absolute top-full left-0 hidden group-hover/nav:block bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 min-w-[160px] z-10 mt-1">
                    {kids.map(k => (
                      <span key={k.id} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-default">
                        {k.navLabel || k.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-semibold">No navigation items yet</p>
          <p className="text-gray-400 text-sm mt-1">Add a page or link to build your nav bar.</p>
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
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
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <Droppable droppableId="regular">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 border-blue-200' : ''}`}
                    >
                      {topLevel.filter(p => !p.isReserved).map((page, index) => (
                        <Draggable key={page.id} draggableId={page.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <NavRow
                                page={page}
                                depth={0}
                                isLink={page.slug?.startsWith('__link_')}
                                children={childrenOf(page.id)}
                                onEdit={p => setModal({ mode: 'edit', page: p })}
                                onDelete={handleDelete}
                                onAddChild={parentId => setModal({ mode: 'add', parentId })}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
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
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Reserved Paths</h3>
                  <div className="flex-1 h-px bg-amber-100" />
                </div>
                <Droppable droppableId="reserved">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1 bg-amber-50/60 border border-amber-200 rounded-2xl p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-amber-100 border-amber-300' : ''}`}
                    >
                      {topLevel.filter(p => p.isReserved).map((page, index) => (
                        <Draggable key={page.id} draggableId={page.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
                            >
                              <NavRow
                                page={page}
                                depth={0}
                                isLink={page.slug?.startsWith('__link_')}
                                children={childrenOf(page.id)}
                                onEdit={p => setModal({ mode: 'edit', page: p })}
                                onDelete={handleDelete}
                                onAddChild={parentId => setModal({ mode: 'add', parentId })}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <p className="mt-2 text-xs text-amber-600/80 px-2 flex items-center gap-1.5">
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
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 px-1">
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
