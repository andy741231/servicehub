import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Eye, Download, ArrowLeft, Share2, Check, Plus, X, Undo2, Redo2, History, Smartphone, Tablet, Monitor, Loader2, Search, PanelsTopLeft, MoreHorizontal, ChevronDown, Pencil, ChevronLeft, ChevronRight, PanelLeft, PanelRight, Type, List, Calculator, User, SeparatorHorizontal, Code, Copy, AlertTriangle } from 'lucide-react';
import FormCanvas from './components/FormCanvas';
import FormRenderer from './components/FormRenderer';
import FieldPalette from './components/FieldPalette';
import { FIELD_TYPES, accentFor, CATEGORY_ACCENT, CATEGORY_ORDER } from './components/FieldPalette';
import PropertiesPanel from './components/PropertiesPanel';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import useFormStore from './store/formStore';
import { isDuplicateName } from './utils/slug';
import { useToast } from '../../components/Toast';

// Representative icon per field category — used by the collapsed left rail
const CATEGORY_ICON = {
  Basic: Type,
  Choice: List,
  Advanced: Calculator,
  Personal: User,
  Layout: SeparatorHorizontal,
};

export default function FormsBuilder() {
  const navigate = useNavigate();
  const { formSlug } = useParams();
  const [selectedField, setSelectedField] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [targetRowId, setTargetRowId] = useState(null);
  // When set, the field modal adds the new field as a child of this repeating group
  const [targetGroupId, setTargetGroupId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // Inline rename via the header breadcrumb title
  const [headerEditing, setHeaderEditing] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const headerInputRef = useRef(null);
  const [historyOpenCount, setHistoryOpenCount] = useState(0);
  // Right-pane mode: 'design' shows properties, 'preview' shows live split preview
  const [rightMode, setRightMode] = useState('design');
  // Device width for the split preview pane
  const [deviceWidth, setDeviceWidth] = useState('desktop'); // 'mobile' | 'tablet' | 'desktop'
  // Autosave status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  // Command palette ('/' to open)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  // Highlighted row index for arrow-key navigation in the command palette
  const [paletteHighlight, setPaletteHighlight] = useState(0);
  // Toolbar "More" overflow menu (Export / History)
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  // Field modal category filter ('all' | 'Basic' | 'Choice' | etc.)
  const [fieldModalCategory, setFieldModalCategory] = useState('all');
  // Recently-used field types (for the command palette) — persisted to localStorage
  const [recentFieldTypes, setRecentFieldTypes] = useState(() => {
    try {
      const stored = localStorage.getItem('forms-recent-fields');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  // ARIA live announcement text (for structural changes: add/remove/reorder)
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  // Collapsible sidebars — give the canvas more room when the user is focused on editing
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  // Responsive drawer mode: on narrow screens the sidebars overlay instead of pushing the canvas.
  // `leftDrawerOpen` / `rightDrawerOpen` are only meaningful below the lg breakpoint.
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  // Track viewport width so we can auto-collapse the right panel below `lg` and
  // switch the sidebars to overlay drawers below `md`.
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  // Below lg (1024px) auto-collapse the right panel to its icon rail so the canvas
  // keeps usable width. Below md (768px) both panels become overlay drawers.
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isNarrow = viewportWidth < 768;   // md breakpoint — drawers
  const isCompact = viewportWidth < 1024; // lg breakpoint — auto-collapse right
  // Effective collapse states account for responsive behaviour.
  // Left panel: only user-controlled collapse on wide screens; drawers on narrow.
  const leftCollapsed = !isNarrow && isLeftCollapsed;
  // Right panel: auto-collapses on compact screens, but `rightDrawerOpen` can
  // temporarily pop it out as an overlay drawer (so rail icons still work).
  const rightIsDrawer = isNarrow || (isCompact && rightDrawerOpen);
  const rightCollapsed = !rightIsDrawer && !isNarrow && (isRightCollapsed || isCompact);

  // Open the right panel from the collapsed rail — expands inline on wide screens,
  // or opens as an overlay drawer on compact screens.
  const openRightPanel = (mode) => {
    setShowHistory(false);
    setRightMode(mode);
    if (isCompact && !isNarrow) {
      setRightDrawerOpen(true);
    } else {
      setIsRightCollapsed(false);
    }
  };
  const openRightHistory = () => {
    setShowHistory(true);
    if (isCompact && !isNarrow) {
      setRightDrawerOpen(true);
    } else {
      setIsRightCollapsed(false);
    }
  };

  // Filtered field list for the command palette (computed once, used in render + keyboard nav)
  const paletteResults = useMemo(() => {
    const q = paletteQuery.toLowerCase().trim();
    if (!q) return FIELD_TYPES;
    return FIELD_TYPES.filter(
      ({ label, description }) =>
        label.toLowerCase().includes(q) || description.toLowerCase().includes(q)
    );
  }, [paletteQuery]);

  // Reset highlight whenever the query (or result set) changes
  useEffect(() => {
    setPaletteHighlight(0);
  }, [paletteQuery]);

  // Keep the highlighted row scrolled into view inside the palette list
  useEffect(() => {
    if (paletteHighlightRef.current) {
      paletteHighlightRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [paletteHighlight]);

  // Arrow-key + Enter navigation for the command palette (attached to the input)
  const handlePaletteKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteHighlight((i) => Math.min(i + 1, Math.max(paletteResults.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = paletteResults[paletteHighlight];
      if (picked) {
        handleAddField(picked.type);
        setShowCommandPalette(false);
        setPaletteQuery('');
      }
    }
  };

  // Track the last-saved snapshot so we can compute "dirty" state for autosave
  const lastSavedSnapshotRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  // Ref to the latest handleSave so the global Ctrl+S listener can call it
  const handleSaveRef = useRef(null);
  // Ref to the currently-highlighted command-palette row (for scroll-into-view)
  const paletteHighlightRef = useRef(null);

  const {
    fields,
    rows,
    addField,
    addRow,
    removeRow,
    updateRow,
    duplicateRow,
    reorderRows,
    removeField,
    duplicateField,
    currentFormId,
    forms,
    setCurrentForm,
    saveCurrentForm,
    createNewForm,
    loadForms,
    isLoading,
    undo,
    redo,
    _history,
    _future,
    renameForm,
  } = useFormStore();
  const { toast, ToastMount } = useToast();

  // Keyboard shortcuts: Escape closes modal, Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo, '/' opens command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showCommandPalette) { setShowCommandPalette(false); setPaletteQuery(''); return; }
        if (showFieldModal) { setShowFieldModal(false); setTargetRowId(null); setTargetGroupId(null); return; }
      }
      const isInputTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
        e.target.isContentEditable;
      if (isInputTarget) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current && handleSaveRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFieldModal, showCommandPalette, undo, redo]);

  const currentForm = forms.find((f) => f.id === currentFormId);
  const findFormBySlug = (slug) => forms.find((f) => f.slug === slug || f.id === slug);

  // Live validation: detect duplicate form names as the user types.
  // Treated as a validation requirement (not a transient error) — blocks save
  // and is shown prominently inline on the title input.
  const isDuplicateTitle = useMemo(
    () => formTitle.trim().length > 0 && isDuplicateName(formTitle, forms, currentFormId),
    [formTitle, forms, currentFormId]
  );

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  useEffect(() => {
    if (formSlug) {
      const form = findFormBySlug(formSlug);
      if (form) {
        setCurrentForm(form.id);
        setFormTitle(form.title);
        setFormDescription(form.description);
      }
    } else if (!currentFormId && !isLoading) {
      const create = async () => {
        const newFormId = await createNewForm();
        const latestForms = useFormStore.getState().forms;
        const newForm = latestForms.find((f) => f.id === newFormId) || latestForms.find((f) => f.slug === newFormId);
        if (newForm?.slug) {
          navigate(`/hub-admin/forms/builder/${newForm.slug}`, { replace: true });
        }
      };
      create();
    }
  }, [formSlug, currentFormId, forms, setCurrentForm, createNewForm, navigate, isLoading]);

  // ─── Autosave ────────────────────────────────────────────────────────────
  // Serialise the editable form state so we can detect "dirty" changes.
  const currentSnapshot = useMemo(
    () => JSON.stringify({ t: formTitle, d: formDescription, f: fields, r: rows }),
    [formTitle, formDescription, fields, rows]
  );

  // When the current form changes (load / switch), seed the saved snapshot so we
  // don't immediately flag it as dirty.
  useEffect(() => {
    if (currentFormId) {
      lastSavedSnapshotRef.current = currentSnapshot;
      setSaveStatus('idle');
      isInitialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFormId]);

  // Debounced autosave whenever the snapshot diverges from the last saved one.
  useEffect(() => {
    if (!currentFormId || isInitialLoadRef.current) return;
    if (lastSavedSnapshotRef.current === currentSnapshot) {
      setSaveStatus((s) => (s === 'saving' ? s : 'idle'));
      return;
    }
    // Mark unsaved and schedule a debounced save.
    setSaveStatus('unsaved');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveCurrentForm(formTitle, formDescription);
        lastSavedSnapshotRef.current = JSON.stringify({ t: formTitle, d: formDescription, f: fields, r: rows });
        setSaveStatus('saved');
        // Clear "saved" badge after a moment
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2500);
      } catch (e) {
        console.error('Autosave failed:', e);
        setSaveStatus('error');
      }
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnapshot, currentFormId]);

  // Flush pending autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const handleAddField = (type, parentGroupId) => {
    const id = `field-${Date.now()}`;
    const base = {
      id,
      type,
      label: '',
      placeholder: '',
      required: false,
    };
    const typeDefaults = {
      select: { options: [''] },
      checkbox: { options: [''] },
      content: { content: '' },
      image: { imageUrl: '' },
      file: { accept: '', maxSize: 5 },
      rating: { maxStars: 5 },
      slider: { min: 0, max: 100, step: 1 },
      name: {},
      address: {},
      url: {},
      computed: { formula: '', displayFormat: '{value}' },
      repeatingGroup: { minInstances: 1, maxInstances: '', addButtonLabel: 'Add another' },
    };
    const newField = { ...base, ...(typeDefaults[type] || {}) };
    // If adding into a repeating group, stamp the groupId so the renderer
    // treats this field as a child of the group (not a top-level field).
    if (parentGroupId) newField.groupId = parentGroupId;
    const rowId = targetRowId || (selectedField ? fields.find((f) => f.id === selectedField)?.rowId : undefined) || rows[rows.length - 1]?.id;
    addField(newField, rowId);
    setSelectedField(id);
    setShowFieldModal(false);
    setTargetRowId(null);
    // Track recently-used field types (for the command palette) — keep last 3, dedupe
    setRecentFieldTypes((prev) => {
      const next = [type, ...prev.filter((t) => t !== type)].slice(0, 3);
      try { localStorage.setItem('forms-recent-fields', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    const ft = FIELD_TYPES.find((f) => f.type === type);
    setAriaAnnouncement(`Field "${ft?.label || type}" added`);
  };

  const handleSelectField = (fieldId) => {
    setSelectedField(fieldId);
    setSelectedSection(null);
  };

  // Empty-canvas hero: create the first row and immediately open the field modal
  const handleStartBuilding = () => {
    const newRowId = addRow('1');
    setTargetRowId(newRowId);
    setShowFieldModal(true);
  };

  // Empty-canvas hero: populate the current (empty) form with a template's fields.
  // Unlike the full FormTemplates page, this does NOT create a new form — it
  // fills the form the user is already editing.
  const handleUseTemplate = (template) => {
    const rowId = `row-${Date.now()}`;
    const newFields = template.fields.map((f) => ({
      ...f,
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      rowId,
      required: f.required || false,
      options: f.options ? [...f.options] : (f.type === 'select' || f.type === 'checkbox' ? [''] : undefined),
    }));
    useFormStore.setState({
      rows: [{ id: rowId, columns: '1' }],
      fields: newFields,
    });
    setFormTitle(template.title);
    setFormDescription(template.description || '');
    toast(`Started from "${template.title}" template`);
  };

  const handleSelectSection = (rowId) => {
    setSelectedSection(rowId);
    setSelectedField(null);
  };

  const handleDeleteField = (fieldId) => {
    const fld = fields.find((f) => f.id === fieldId);
    removeField(fieldId);
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
    if (fld) setAriaAnnouncement(`Field "${fld.label || fld.type}" removed`);
  };

  const handleDuplicateField = (fieldId) => {
    const fld = fields.find((f) => f.id === fieldId);
    duplicateField(fieldId);
    if (fld) setAriaAnnouncement(`Field "${fld.label || fld.type}" duplicated`);
  };

  const handleSave = async () => {
    setSaveError(null);
    const latestForms = useFormStore.getState().forms;
    const latestCurrentFormId = useFormStore.getState().currentFormId;
    // Duplicate name is a validation requirement — the inline validation on the
    // title input already surfaces this prominently, so just bail out here
    // without setting a transient saveError.
    if (latestCurrentFormId && isDuplicateName(formTitle, latestForms, latestCurrentFormId)) {
      setSaveStatus('error');
      return;
    }

    // Cancel any pending autosave since we're saving explicitly now
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await saveCurrentForm(formTitle, formDescription);
      lastSavedSnapshotRef.current = JSON.stringify({ t: formTitle, d: formDescription, f: fields, r: rows });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2500);

      const updatedForm = useFormStore.getState().forms.find((f) => f.id === useFormStore.getState().currentFormId);
      if (updatedForm && formSlug && updatedForm.slug !== formSlug) {
        navigate(`/hub-admin/forms/builder/${updatedForm.slug}`, { replace: true });
      }
    } catch (e) {
      console.error('Error saving form:', e);
      const isConflict = e?.response?.status === 409;
      if (isConflict) {
        // The backend knows about a form with this name that our local list
        // doesn't reflect (stale state, failed delete, or concurrent edit).
        // Reload the forms list so the conflicting form becomes visible.
        loadForms();
        setSaveError('A form with this name already exists but was not visible in your form list. The list has been refreshed — check it now.');
      } else {
        const message = e?.response?.data?.error || e?.message || 'Failed to save form. Please try again.';
        setSaveError(message);
      }
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };
  // Keep the ref in sync so the global Ctrl+S listener can invoke the latest closure
  handleSaveRef.current = handleSave;

  const handleExport = () => {
    const formSchema = JSON.stringify({
      title: formTitle,
      description: formDescription,
      rows,
      fields 
    }, null, 2);
    const blob = new Blob([formSchema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formTitle.replace(/\s+/g, '-').toLowerCase()}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToDashboard = () => {
    navigate('/hub-admin/forms/list');
  };

  const handleShareForm = async () => {
    const currentForm = forms.find((f) => f.id === currentFormId);
    const formUrl = `${window.location.origin}/form/${currentForm?.slug || currentFormId}`;
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
      toast('Share link copied to clipboard.', 'success');
    } catch (e) {
      toast(`Copy failed — link: ${formUrl}`, 'info');
    }
  };

  // Inline rename from the header breadcrumb title.
  const startHeaderRename = () => {
    setHeaderTitle(formTitle);
    setHeaderEditing(true);
    setTimeout(() => headerInputRef.current?.select(), 30);
  };
  const commitHeaderRename = async () => {
    const trimmed = (headerTitle || '').trim();
    setHeaderEditing(false);
    if (!trimmed || trimmed === formTitle || !currentFormId) return;
    if (isDuplicateName(trimmed, forms, currentFormId)) {
      toast('A form with this name already exists.', 'error');
      return;
    }
    setFormTitle(trimmed);
    try {
      await renameForm(currentFormId, trimmed);
      toast(`Renamed to "${trimmed}".`, 'success');
    } catch (e) {
      if (e?.response?.status === 409) {
        toast('A form with this name already exists.', 'error');
        setFormTitle(formTitle);
      } else {
        toast('Failed to rename. Please try again.', 'error');
        setFormTitle(formTitle);
      }
    }
  };

  if (showPreview) {
    const currentForm = forms.find((f) => f.id === currentFormId);
    if (!currentForm) return null;

    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-base text-body hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </button>
        </div>
        <FormRenderer
          form={{
            ...currentForm,
            title: formTitle,
            description: formDescription,
            fields,
          }}
          preview
        />
      </div>
    );
  }

  if (isLoading && !currentFormId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-body text-muted">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#form-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-base focus:shadow-modal focus:text-small focus:font-medium"
      >
        Skip to canvas
      </a>
      {/* ARIA live region for structural change announcements */}
      <div aria-live="polite" className="sr-only">{ariaAnnouncement}</div>
      {/* Left Sidebar — Field Palette (collapsible rail / overlay drawer on narrow screens) */}
      {isNarrow && leftDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setLeftDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${isNarrow ? `fixed left-0 top-0 bottom-0 z-40 shadow-modal w-60 ${leftDrawerOpen ? '' : '-translate-x-full'}` : `flex-shrink-0 border-r border-border ${leftCollapsed ? 'w-12' : 'w-60'}`} bg-surface flex flex-col sidebar-transition`}
        aria-label="Field palette"
      >
        {leftCollapsed ? (
          // ── Collapsed icon rail ──
          <>
            <div className="p-2 border-b border-border flex flex-col items-center gap-1">
              <button
                onClick={() => { setTargetRowId(null); setShowFieldModal(true); }}
                className="flex items-center justify-center w-8 h-8 rounded-base text-muted hover:text-primary hover:bg-primary-light/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                title="Browse all fields"
                aria-label="Browse all fields"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center justify-center w-8 h-8 rounded-base text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                title="Command palette (/)"
                aria-label="Open command palette"
              >
                /
              </button>
              <button
                onClick={() => setIsLeftCollapsed(false)}
                className="flex items-center justify-center w-8 h-8 rounded-base text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                title="Expand panel"
                aria-label="Expand field palette"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 p-2 overflow-y-auto">
              {CATEGORY_ORDER.map((category) => {
                const Icon = CATEGORY_ICON[category];
                const accent = accentFor(category);
                if (!Icon) return null;
                return (
                  <button
                    key={category}
                    onClick={() => setIsLeftCollapsed(false)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${accent.chip}`}
                    title={`${category} fields — expand to browse`}
                    aria-label={`${category} fields`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          // ── Expanded panel ──
          <>
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-small font-semibold text-base uppercase tracking-wide">Add Field</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowCommandPalette(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted hover:text-base border border-border rounded hover:bg-surface-raised transition-colors"
                    title="Command palette (/)"
                    aria-label="Open command palette"
                  >
                    <span>/</span>
                  </button>
                  {isNarrow ? (
                    <button
                      onClick={() => setLeftDrawerOpen(false)}
                      className="flex items-center justify-center w-6 h-6 rounded text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      title="Close panel"
                      aria-label="Close field palette"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsLeftCollapsed(true)}
                      className="flex items-center justify-center w-6 h-6 rounded text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      title="Collapse panel"
                      aria-label="Collapse field palette"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setTargetRowId(null); setShowFieldModal(true); }}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary hover:bg-primary-light/30 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                <Plus className="h-4 w-4" />
                Browse all fields
              </button>
            </div>
            <FieldPalette onAddField={handleAddField} />
            <div className="p-3 border-t border-border text-xs text-subtle">
              <p>Tip: press <kbd className="px-1 py-0.5 bg-surface-raised border border-border rounded text-small">/</kbd> to add a field fast.</p>
            </div>
          </>
        )}
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Toolbar */}
        <header className="h-14 bg-surface border-b border-border flex items-center px-3 gap-3">
          {/* Left cluster: back · undo/redo · form breadcrumb + status */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isNarrow && (
              <button
                onClick={() => setLeftDrawerOpen((v) => !v)}
                className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
                title="Toggle field palette"
                aria-label="Toggle field palette"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleBackToDashboard}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
              title="Back to dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border mx-0.5" aria-hidden="true" />
            <button
              onClick={undo}
              disabled={!_history.length}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!_future.length}
              className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-border mx-0.5" aria-hidden="true" />
            {/* Form breadcrumb + status badge */}
            <div className="flex items-center gap-2 min-w-0 max-w-[280px]">
              {headerEditing ? (
                <input
                  ref={headerInputRef}
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  onBlur={commitHeaderRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitHeaderRename(); }
                    if (e.key === 'Escape') { setHeaderEditing(false); }
                  }}
                  className="text-small font-semibold text-base bg-surface border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary min-w-0 max-w-[200px]"
                  aria-label="Rename form"
                />
              ) : (
                <button
                  type="button"
                  onClick={startHeaderRename}
                  className="group inline-flex items-center gap-1 min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 px-0.5"
                  title="Click to rename"
                  aria-label="Rename form"
                >
                  <span className="text-small font-semibold text-base truncate" title={formTitle}>
                    {formTitle || 'Untitled Form'}
                  </span>
                  <Pencil className="h-3 w-3 text-subtle opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
                </button>
              )}
              <span className={`badge flex-shrink-0 ${fields.length === 0 ? 'badge-neutral' : 'badge-success'}`}>
                {fields.length === 0 ? 'Draft' : 'Published'}
              </span>
            </div>
          </div>

          {/* Center cluster: autosave status */}
          <div className="flex-1 flex items-center justify-center min-w-0" aria-live="polite">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-small text-muted bg-surface-raised/60 px-2.5 py-1 rounded-full">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-small text-success bg-success-light px-2.5 py-1 rounded-full animate-in fade-in zoom-in-110 duration-200">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1.5 text-small text-muted bg-surface-raised/60 px-2.5 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" /> Unsaved changes
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-small text-danger bg-danger-light px-2.5 py-1 rounded-full" title={saveError || 'Save failed'}>
                <X className="h-3.5 w-3.5" /> Save error
              </span>
            )}
          </div>

          {/* Right cluster: preview · share · more (export/history) · save */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isNarrow && (
              <button
                onClick={() => setRightDrawerOpen((v) => !v)}
                className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[44px] min-h-[44px] transition-all duration-150 active:scale-95"
                title="Toggle properties panel"
                aria-label="Toggle properties panel"
              >
                <PanelRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-all duration-150 active:scale-95"
              title="Preview form"
              aria-label="Preview form"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">Preview</span>
            </button>
            <button
              onClick={handleShareForm}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-all duration-150 active:scale-95"
              title="Share form"
              aria-label="Share form"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  <span className="text-body text-success">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span className="text-body">Share</span>
                </>
              )}
            </button>

            {/* More overflow menu: Export · History */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className={`flex items-center gap-1 px-2 py-2 border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-all duration-150 active:scale-95 ${showMoreMenu ? 'bg-surface border-border-strong shadow-sm' : 'bg-surface-raised border-border hover:bg-surface'}`}
                title="More actions"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <ChevronDown className="h-3 w-3 text-subtle" aria-hidden="true" />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-11 z-40 w-48 bg-surface border border-border rounded-base shadow-dropdown py-1 animate-in fade-in slide-in-from-top-1 duration-150" role="menu">
                    <button
                      onClick={() => { handleExport(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-body text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      role="menuitem"
                    >
                      <Download className="h-4 w-4 text-subtle" aria-hidden="true" />
                      Export schema
                    </button>
                    <button
                      onClick={() => { setShowHistory((v) => { if (!v) setHistoryOpenCount((c) => c + 1); return !v; }); setShowMoreMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-body hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${showHistory ? 'text-primary' : 'text-base'}`}
                      role="menuitem"
                      aria-pressed={showHistory}
                    >
                      <History className="h-4 w-4 text-subtle" aria-hidden="true" />
                      Version history
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-border mx-0.5" aria-hidden="true" />
            <button
              onClick={handleSave}
              disabled={isSaving || isDuplicateTitle}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
              title={isDuplicateTitle ? 'Fix the duplicate form name before saving' : 'Save form (Ctrl+S)'}
              aria-label="Save form"
              aria-disabled={isDuplicateTitle}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span className="text-body">{isSaving ? 'Saving…' : 'Save'}</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <div
          id="form-canvas"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-background canvas-grid focus:outline-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); }
          }}
        >
          <div
            className={`mx-auto px-6 py-6 md:px-10 md:py-10 ${rows.some((r) => r.columns !== '1') ? 'max-w-6xl' : 'max-w-3xl'}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); }
            }}
          >
            {/* Form header card */}
            <div
              className="mb-6 rounded-xl border border-border bg-surface px-6 py-5 shadow-card transition-all duration-200"
              onClick={(e) => { if (e.target === e.currentTarget) { setSelectedField(null); setSelectedSection(null); } }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">Form details</span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <label htmlFor="form-title" className="sr-only">Form title</label>
              <input
                id="form-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Untitled Form"
                aria-invalid={isDuplicateTitle}
                className={`w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-base placeholder:text-subtle px-0 ${isDuplicateTitle ? 'text-danger' : ''}`}
                aria-label="Form title"
                aria-describedby={isDuplicateTitle ? 'form-title-duplicate-warning' : undefined}
              />
              {isDuplicateTitle && (
                <div
                  id="form-title-duplicate-warning"
                  role="alert"
                  className="mt-2 flex items-start gap-2 text-small text-danger bg-danger-light border border-danger/30 px-3 py-2 rounded-base"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    A form named <strong>"{formTitle.trim()}"</strong> already exists.
                    Choose a different name to save this form.
                  </span>
                </div>
              )}
              <label htmlFor="form-description" className="sr-only">Form description</label>
              <textarea
                id="form-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={formDescription ? '' : 'Add a description to help respondents understand this form…'}
                className="w-full mt-1.5 text-body bg-transparent border-none focus:outline-none focus:ring-0 text-muted placeholder:text-subtle resize-none px-0"
                rows={2}
                aria-label="Form description"
              />
              {saveError && (
                <p className="mt-3 text-small text-danger bg-danger-light px-3 py-2 rounded-base">
                  {saveError}
                </p>
              )}
            </div>
            <FormCanvas
              fields={fields}
              rows={rows}
              onSelectField={handleSelectField}
              onDeleteField={handleDeleteField}
              onDuplicateField={handleDuplicateField}
              onInsertField={(rowId) => { setTargetRowId(rowId); setShowFieldModal(true); }}
              onAddRow={(afterRowId) => addRow('1', afterRowId)}
              onStartBuilding={handleStartBuilding}
              onUseTemplate={handleUseTemplate}
              onAddToGroup={(groupId) => { setTargetRowId(null); setTargetGroupId(groupId); setShowFieldModal(true); }}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
              onDuplicateRow={duplicateRow}
              onReorderRows={reorderRows}
              selectedField={selectedField}
              selectedSection={selectedSection}
              onSelectSection={handleSelectSection}
            />
          </div>
        </div>
      </main>

      {/* Right Sidebar - Version History, Properties, or Live Preview (collapsible rail / overlay drawer on narrow screens) */}
      {rightIsDrawer && rightDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setRightDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${rightIsDrawer ? `fixed right-0 top-0 bottom-0 z-40 shadow-modal w-80 ${rightDrawerOpen ? '' : 'translate-x-full'}` : `${rightCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 border-l border-border`} bg-surface flex flex-col sidebar-transition`}
        aria-label={showHistory ? 'Version history' : rightMode === 'preview' ? 'Live preview' : 'Properties panel'}
      >
        {rightCollapsed && !rightIsDrawer ? (
          // ── Collapsed icon rail ──
          <div className="flex flex-col items-center gap-1 p-2">
            <button
              onClick={() => openRightPanel('design')}
              className={`flex items-center justify-center w-8 h-8 rounded-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${!showHistory && rightMode === 'design' ? 'bg-primary-light text-primary' : 'text-muted hover:text-base hover:bg-surface-raised'}`}
              title="Design (properties)"
              aria-label="Open design panel"
            >
              <PanelsTopLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => openRightPanel('preview')}
              className={`flex items-center justify-center w-8 h-8 rounded-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${!showHistory && rightMode === 'preview' ? 'bg-primary-light text-primary' : 'text-muted hover:text-base hover:bg-surface-raised'}`}
              title="Live preview"
              aria-label="Open live preview"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={openRightHistory}
              className={`flex items-center justify-center w-8 h-8 rounded-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${showHistory ? 'bg-primary-light text-primary' : 'text-muted hover:text-base hover:bg-surface-raised'}`}
              title="Version history"
              aria-label="Open version history"
            >
              <History className="h-4 w-4" />
            </button>
            <div className="h-px w-6 bg-border my-1" aria-hidden="true" />
            <button
              onClick={() => setIsRightCollapsed(false)}
              className="flex items-center justify-center w-8 h-8 rounded-base text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Expand panel"
              aria-label="Expand panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : showHistory ? (
          <VersionHistoryPanel
            key={`history-${historyOpenCount}`}
            formId={currentFormId}
            onClose={() => setShowHistory(false)}
            onRestored={(form) => {
              setFormTitle(form.title);
              setFormDescription(form.description || '');
              setShowHistory(false);
            }}
          />
        ) : (
          <>
            {/* Segmented control: Design | Preview | Code + collapse/close */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-surface-raised">
              <div className="flex-1 flex items-center gap-0.5 p-0.5 bg-surface rounded-base border border-border">
                {[
                  { id: 'design', label: 'Design', icon: PanelsTopLeft },
                  { id: 'preview', label: 'Preview', icon: Eye },
                  { id: 'code', label: 'Code', icon: Code },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setRightMode(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-base text-small font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${rightMode === id ? 'bg-surface text-base shadow-sm' : 'text-muted hover:text-base'}`}
                    aria-pressed={rightMode === id}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
              {rightIsDrawer ? (
                <button
                  onClick={() => setRightDrawerOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-base text-muted hover:text-base hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Close panel"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRightCollapsed(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-base text-muted hover:text-base hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Collapse panel"
                  aria-label="Collapse panel"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {rightMode === 'design' ? (
              <>
                <div className="px-4 py-3 border-b border-border">
                  {(selectedField || selectedSection) ? (
                    <button
                      onClick={() => { setSelectedField(null); setSelectedSection(null); }}
                      className="flex items-center gap-1 text-small text-muted hover:text-base mb-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label="Back to form properties"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Form properties
                    </button>
                  ) : null}
                  <h2 className="text-lg font-bold text-base truncate">
                    {selectedField
                      ? (fields.find((f) => f.id === selectedField)?.label || 'Field Properties')
                      : selectedSection
                      ? (rows.find((r) => r.id === selectedSection)?.label || 'Section Properties')
                      : 'Form Properties'}
                  </h2>
                  <p className="text-small text-muted mt-0.5">
                    {selectedField ? 'Edit the selected field' : selectedSection ? 'Edit the selected section' : 'Form-wide settings & theme'}
                  </p>
                </div>
                <PropertiesPanel
                  selectedField={selectedField}
                  selectedSection={selectedSection}
                  onUpdateField={() => {}}
                />
              </>
            ) : rightMode === 'preview' ? (
              <>
                {/* Sticky preview header with device-width label */}
                <div className="flex items-center justify-between gap-2 p-2 border-b border-border bg-surface">
                  <span className="text-xs text-muted px-1">
                    {deviceWidth === 'mobile' ? 'Mobile · 375px' : deviceWidth === 'tablet' ? 'Tablet · 768px' : 'Desktop · 100%'}
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                      { id: 'tablet', icon: Tablet, label: 'Tablet' },
                      { id: 'desktop', icon: Monitor, label: 'Desktop' },
                    ].map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => setDeviceWidth(id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-small transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${deviceWidth === id ? 'bg-primary-light text-primary' : 'text-muted hover:text-base hover:bg-surface-raised'}`}
                        title={label}
                        aria-pressed={deviceWidth === id}
                        aria-label={`${label} preview`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-background p-3">
                  {/* Device frame — thin bezel mimic */}
                  <div
                    className="mx-auto transition-all duration-200 bg-white rounded-lg shadow-card overflow-hidden border border-border"
                    style={{ maxWidth: deviceWidth === 'mobile' ? 375 : deviceWidth === 'tablet' ? 768 : '100%' }}
                  >
                    {currentForm ? (
                      <FormRenderer
                        form={{
                          ...currentForm,
                          title: formTitle,
                          description: formDescription,
                          fields,
                        }}
                        preview
                      />
                    ) : (
                      <div className="p-8 text-center text-muted text-body">Loading preview…</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ── Code mode: exported JSON schema ── */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface">
                  <span className="text-xs text-muted">Form schema (JSON)</span>
                  <button
                    onClick={() => {
                      const schema = JSON.stringify({ title: formTitle, description: formDescription, fields, rows }, null, 2);
                      navigator.clipboard?.writeText(schema);
                      toast('Schema copied to clipboard');
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-small text-muted hover:text-base hover:bg-surface-raised transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    title="Copy schema to clipboard"
                    aria-label="Copy schema to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-surface-raised/50 p-3">
                  <pre className="text-code text-base whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify({ title: formTitle, description: formDescription, fields, rows }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Insert new field modal */}
      {showFieldModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] animate-in fade-in duration-200"
          onClick={() => { setShowFieldModal(false); setTargetRowId(null); setTargetGroupId(null); }}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] mx-4 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="field-modal-title"
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 id="field-modal-title" className="text-xl font-semibold text-base">
                    {targetGroupId ? 'Add field to group' : 'Insert new field'}
                  </h3>
                  <p className="text-small text-muted">
                    {targetGroupId ? 'This field will repeat with each group instance' : 'Choose a field type to add to your form'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowFieldModal(false); setTargetRowId(null); setTargetGroupId(null); }}
                className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
                title="Close (Esc)"
                aria-label="Close field picker"
              >
                <X className="w-5 h-5 text-subtle" />
              </button>
            </div>

            {/* Category filter tabs */}
            <div className="px-6 pt-4 pb-2 flex items-center gap-1 flex-wrap border-b border-border">
              {['all', ...CATEGORY_ORDER].map((cat) => {
                const count = cat === 'all' ? FIELD_TYPES.length : FIELD_TYPES.filter((f) => f.category === cat).length;
                if (count === 0) return null;
                const isActive = fieldModalCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFieldModalCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted hover:text-base hover:bg-surface-raised border border-border'
                    }`}
                    aria-pressed={isActive}
                  >
                    {cat === 'all' ? 'All' : cat}
                    <span className={`ml-1.5 text-xs ${isActive ? 'text-primary-foreground/70' : 'text-subtle'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Options grid */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FIELD_TYPES
                  .filter(({ category }) => fieldModalCategory === 'all' || category === fieldModalCategory)
                  .map(({ type, label, icon: Icon, description, category }) => {
                  const accent = accentFor(category);
                  return (
                  <button
                    key={type}
                    onClick={() => handleAddField(type, targetGroupId)}
                    className="p-5 border-2 border-border rounded-xl hover:border-primary hover:bg-primary-light/40 hover:elevation-2 transition-all duration-200 text-left group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 active:scale-[0.98]"
                    aria-label={`Add ${label} field`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${accent.chip}`}>
                        <Icon className={`w-6 h-6 transition-colors ${accent.ring}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{label}</div>
                        <p className="text-small text-muted">{description}</p>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => { setShowFieldModal(false); setTargetRowId(null); setTargetGroupId(null); }}
                className="px-5 py-2.5 border border-border text-base rounded-xl hover:bg-surface-raised transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command palette — press '/' to insert a field by typing */}
      {showCommandPalette && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-start justify-center pt-[15vh] z-[9999]"
          onClick={() => { setShowCommandPalette(false); setPaletteQuery(''); }}
        >
          <div
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col animate-[fadeInScale_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-4 w-4 text-subtle" />
              <input
                autoFocus
                type="text"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Search field types to add…"
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-body placeholder:text-muted"
                aria-label="Search field types"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls="command-palette-list"
                role="combobox"
              />
              <kbd className="px-1.5 py-0.5 bg-surface-raised border border-border rounded text-small text-muted">Esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2" id="command-palette-list" role="listbox">
              {/* Recently used section (only when no query) */}
              {!paletteQuery.trim() && recentFieldTypes.length > 0 && (
                <>
                  <div className="px-2 pt-1 pb-1.5 text-xs font-semibold text-subtle uppercase tracking-wide">Recently used</div>
                  {recentFieldTypes.map((type) => {
                    const ft = FIELD_TYPES.find((f) => f.type === type);
                    if (!ft) return null;
                    const { label, icon: Icon, description, category } = ft;
                    const accent = accentFor(category);
                    const idx = paletteResults.findIndex((r) => r.type === type);
                    const isHighlighted = idx === paletteHighlight;
                    return (
                      <button
                        key={`recent-${type}`}
                        ref={isHighlighted ? paletteHighlightRef : null}
                        onClick={() => { handleAddField(type); setShowCommandPalette(false); setPaletteQuery(''); }}
                        onMouseEnter={() => setPaletteHighlight(idx)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-base text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${isHighlighted ? 'bg-primary-light ring-1 ring-primary/20' : 'hover:bg-surface-raised'}`}
                        aria-label={`Add ${label} field`}
                        role="option"
                        aria-selected={isHighlighted}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.chip}`}>
                          <Icon className={`h-4 w-4 ${accent.ring}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-body font-medium text-base">{label}</div>
                          <div className="text-small text-muted truncate">{description}</div>
                        </div>
                        {isHighlighted && (
                          <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-small text-muted flex-shrink-0">Enter</kbd>
                        )}
                      </button>
                    );
                  })}
                  <div className="px-2 pt-3 pb-1.5 text-xs font-semibold text-subtle uppercase tracking-wide">All fields</div>
                </>
              )}
              {paletteResults.map(({ type, label, icon: Icon, description, category }, index) => {
                const accent = accentFor(category);
                const isHighlighted = index === paletteHighlight;
                return (
                  <button
                    key={type}
                    ref={isHighlighted ? paletteHighlightRef : null}
                    onClick={() => { handleAddField(type); setShowCommandPalette(false); setPaletteQuery(''); }}
                    onMouseEnter={() => setPaletteHighlight(index)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-base text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${isHighlighted ? 'bg-primary-light ring-1 ring-primary/20' : 'hover:bg-surface-raised'}`}
                    aria-label={`Add ${label} field`}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.chip}`}>
                      <Icon className={`h-4 w-4 ${accent.ring}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body font-medium text-base">{label}</div>
                      <div className="text-small text-muted truncate">{description}</div>
                    </div>
                    {isHighlighted && (
                      <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-small text-muted flex-shrink-0">Enter</kbd>
                    )}
                  </button>
                );
              })}
              {paletteResults.length === 0 && (
                <p className="p-4 text-center text-small text-muted">No field types match "{paletteQuery}"</p>
              )}
            </div>
            {/* Footer with keyboard shortcut hints */}
            <div className="px-4 py-2 border-t border-border bg-surface-raised/50 flex items-center justify-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded">Enter</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded">Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      )}
      {ToastMount}
    </div>
  );
}