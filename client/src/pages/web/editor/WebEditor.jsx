import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Type, X, Edit3, Copy, Sparkles, Rows3, History, Eye, AlertCircle, Layers,
} from 'lucide-react';
import api from '../../../utils/api';
import { useConfirm, AccessibleModal } from '../../../components/Dialog';
import { useToast } from '../../../components/Toast';
import EditorToolbar from './EditorToolbar';
import EditorDialogs from './EditorDialogs';
import BlockPicker from './BlockPicker';
import SectionPicker from './SectionPicker';
import { sectionFromTemplate } from './sectionTemplates';
import LayersPanel from './LayersPanel';
import EditorInspector from './EditorInspector';
import WebVersionHistoryPanel from '../WebVersionHistoryPanel';
import { resolveUrl, BLOCK_TYPES, DEFAULT_SECTION, makeDefaultBlockContent, SECTION_LAYOUTS, SPACING_PRESETS, createBlock, createSection, duplicateBlock as duplicateBlockEntity, duplicateSection as duplicateSectionEntity, autoStackFluid, blockCatalogEntry } from './editorUtils';
import {
  BaseEditableText,
  HeroBlock,
  BaseEditableImage,
  BaseEditableButton,
  BackgroundImageDialog,
  EditableBlock,
  StructuredBlockEditor,
  AddSectionModal,
  SectionWrapper,
  AddBlockButton,
} from './editorComponents';
import BlockContent from './BlockContent';
import ReadOnlyBlockContent from './ReadOnlyBlockContent';
import PublicHome from '../../public/Home';
import { resolveSiteTokens, siteThemeStyle, useSiteFonts } from '../../../site/siteTheme';
import { mobilePlacements, isMobileAuto, MOBILE_GRID_COLUMNS } from '../../../site/SiteSections';
import { SiteHeader, SiteFooter } from '../../../site/SiteChrome';
import FluidSection from './fluid/FluidSection.jsx';
import { isTypingTarget, isTextEntryTarget } from './editorUtils';

const MAX_HISTORY = 50; // Bound undo history to prevent memory growth

/**
 * Site header/footer shown on the canvas for context (read-only). They're
 * shared by every page and edited on the Header & Footer screen; hovering
 * offers a link there (new tab, so unsaved canvas edits are never lost).
 */
function SiteFrame({ label, note, children }) {
  return (
    <div className="site-editor-frame">
      <div className="site-editor-frame-content" aria-hidden="true">{children}</div>
      <div className="site-editor-frame-cta site-editor-chrome">
        <a
          href="/hub-admin/web/header-footer"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-text-base text-xs font-semibold shadow-[0_2px_8px_rgba(16,20,30,0.18)] hover:text-primary"
        >
          Edit {label.toLowerCase()} · <span className="font-normal text-muted">{note}</span>
        </a>
      </div>
    </div>
  );
}

export default function WebEditor() {
  const { slug: routeSlug } = useParams();
  const pageSlug = routeSlug || 'home';

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // { status, message } | null
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState(null);
  // sections is the canonical top-level state; blocks is kept only for legacy grid nested blocks
  const [sections, setSections] = useState([]);
  const [header, setHeader] = useState({ logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
  const [footer, setFooter] = useState({ sections: [], copyright: '', styles: {} });
  const [previewDevice, setPreviewDevice] = useState('desktop');
  // Block palette: { sectionIndex, colIndex (for multi-col) }
  const [blockPaletteTarget, setBlockPaletteTarget] = useState(null);
  // Section modal: null = closed, number = insert after that index (-1 = at top)
  const [addSectionAfterIndex, setAddSectionAfterIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState('clean'); // 'clean' | 'dirty' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isPublished, setIsPublished] = useState(true);
  // Undo history lives in a ref (always current — no stale closures from
  // keyboard handlers or timers); historyVersion re-renders undo/redo buttons.
  const historyRef = useRef({ entries: [], index: -1 });
  const [, setHistoryVersion] = useState(0);
  const syncHistoryState = () => setHistoryVersion((v) => v + 1);
  const pendingHistoryRef = useRef(null); // latest uncommitted typing state
  const historyTimerRef = useRef(null);
  // These helpers touch only refs + stable setters, so it is safe to call
  // them from timers or handlers created in an earlier render.
  const pushHistoryEntry = (entry) => {
    const h = historyRef.current;
    const entries = h.entries.slice(0, h.index + 1);
    entries.push(entry);
    while (entries.length > MAX_HISTORY) entries.shift();
    historyRef.current = { entries, index: entries.length - 1 };
    syncHistoryState();
  };
  const flushPendingHistory = () => {
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    const pending = pendingHistoryRef.current;
    if (!pending) return;
    pendingHistoryRef.current = null;
    pushHistoryEntry(pending);
  };
  const cancelPendingHistory = () => {
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = null;
    pendingHistoryRef.current = null;
  };
  const resetHistory = (entry) => {
    cancelPendingHistory();
    historyRef.current = { entries: [entry], index: 0 };
    syncHistoryState();
  };
  useEffect(() => () => clearTimeout(historyTimerRef.current), []);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [announcement, setAnnouncement] = useState(''); // screen-reader-only live region
  const [templateSaving, setTemplateSaving] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);
  // Opening a page goes straight into editing; 'live' is the chrome-free preview.
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'live'
  const navigate = useNavigate();
  // Last state known to match the server — "Exit without saving" restores it.
  const savedSnapshotRef = useRef(null);
  const [hasPublishedSnapshot, setHasPublishedSnapshot] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'mobile'
  const saveRef = useRef();
  const [selectedBlockIds, setSelectedBlockIds] = useState(() => new Set());
  // Selected section (null when a block — or nothing — is selected). Block and
  // section selection are mutually exclusive; the inspector shows whichever.
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Accessible confirm dialog (replaces window.confirm)
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  // Toast notifications (used for delete-undo pattern)
  const { toast, ToastMount } = useToast();

  // ─── Dirty-exit protection ────────────────────────────────────────────────
  // beforeunload — catches tab close, refresh, and external navigation.
  // In-app route navigation (sidebar links, back button) is handled by the
  // browser's native beforeunload when the user clicks a link, plus the
  // handleExitEdit confirm dialog for the editor's own Exit button.
  // (Note: useBlocker requires a data router; this app uses BrowserRouter,
  //  so we rely on beforeunload + explicit confirm in handleExitEdit.)
  // Site theme for the canvas — same tokens/fonts as the public site.
  const siteTokens = resolveSiteTokens(pageData?.siteStyle);
  useSiteFonts(siteTokens, !!pageData);

  const isDirty = saveStatus === 'dirty' || saveStatus === 'error' || saveStatus === 'saving';
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires this
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Wrapper components that notify parent of editing state
  const EditableText = useCallback((props) => (
    <BaseEditableText
      {...props}
      onEditingStart={() => { props.onEditingStart?.(); }}
      onEditingEnd={(e) => {
        props.onEditingEnd?.(e);
      }}
    />
  ), []);

  const EditableImage = useCallback((props) => (
    <BaseEditableImage {...props} onEditingStart={() => props.onEditingStart?.()} onEditingEnd={() => props.onEditingEnd?.()} />
  ), []);

  const EditableButton = useCallback((props) => (
    <BaseEditableButton {...props} onEditingStart={() => props.onEditingStart?.()} onEditingEnd={() => props.onEditingEnd?.()} />
  ), []);

  // Selection handler — supports Cmd/Ctrl+click for multi-select
  const handleSelectBlock = useCallback((id, { additive = false } = {}) => {
    setSelectedSectionIndex(null);
    setSelectedBlockIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
    setSelectedSectionIndex(null);
  }, []);
  const selectSection = useCallback((sIdx) => {
    setSelectedBlockIds(new Set());
    setSelectedSectionIndex(sIdx);
  }, []);

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const { data } = await api.get(`/web/admin/${pageSlug}`);
      setPageData(data);
      const loadedSections = data.sections && data.sections.length > 0
        ? data.sections
        : (data.blocks && data.blocks.length > 0)
          // Legacy: wrap flat blocks into a single section
          ? [{ ...DEFAULT_SECTION, id: 'legacy', order: 0, blocks: data.blocks }]
          : [];
      setSections(loadedSections);
      setHeader(data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
      setFooter(data.footer || { sections: [], copyright: '', styles: {} });
      setIsPublished(data.isPublished ?? true);
      setHasPublishedSnapshot(data.hasPublishedSnapshot ?? false);

      const initialState = { sections: loadedSections, header: data.header || {}, footer: data.footer || {} };
      savedSnapshotRef.current = {
        sections: loadedSections,
        header: data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} },
        footer: data.footer || { sections: [], copyright: '', styles: {} },
      };
      resetHistory(initialState);
    } catch (error) {
      console.error('Failed to fetch page data:', error);
      const status = error?.response?.status;
      let message = 'Something went wrong while loading this page.';
      if (status === 401) message = 'Your session has expired. Please sign in again.';
      else if (status === 403) message = 'You do not have permission to edit this page.';
      else if (status === 404) message = `Page "${pageSlug}" was not found.`;
      else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) message = 'Network error — check your connection and try again.';
      setFetchError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [pageSlug]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);


  // ── Saving ─────────────────────────────────────────────────────────────
  // Drafts autosave ~1.5s after the last change (Ctrl+S saves immediately).
  // changeSeq counts edits; a save records the seq it sent, so edits made
  // while a request is in flight are never mistaken for saved. Saves run
  // one at a time through saveChainRef and always send the LATEST state
  // (latestRef), so overlapping requests can't land out of order.
  const changeSeqRef = useRef(0);
  const savedSeqRef = useRef(0);
  const saveChainRef = useRef(Promise.resolve());
  const latestRef = useRef(null);
  latestRef.current = { sections, header, footer };

  function markDirty() {
    changeSeqRef.current += 1;
    setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
  }

  const runSave = async ({ autosave }) => {
    flushPendingHistory();
    const seq = changeSeqRef.current;
    if (seq === savedSeqRef.current) return; // nothing new
    setSaveStatus('saving');
    const { sections: secs, header: hdr, footer: ftr } = latestRef.current;
    try {
      const { data } = await api.put(`/web/${pageSlug}`, {
        autosave,
        header: hdr,
        footer: ftr,
        sections: secs.map((sec, sIdx) => ({
          ...sec,
          order: sIdx,
          blocks: (sec.blocks || []).map((b, bIdx) => ({ ...b, order: bIdx })),
        })),
      });
      savedSeqRef.current = seq;
      savedSnapshotRef.current = { sections: secs, header: hdr, footer: ftr };
      // The save response has no siteStyle/nav — keep the ones we loaded.
      setPageData((prev) => ({ ...data, siteStyle: data.siteStyle ?? prev?.siteStyle, nav: data.nav ?? prev?.nav }));
      setLastSavedAt(new Date());
      if (changeSeqRef.current !== seq) {
        setSaveStatus('dirty'); // edited during the request — autosave again
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'clean' : s)), 2000);
      }
    } catch (error) {
      console.error('Failed to save page:', error);
      setSaveStatus('error');
      throw error;
    }
  };

  /** Queue a save; resolves when everything up to now is saved (rejects on failure). */
  const saveNow = ({ autosave = false } = {}) => {
    const run = saveChainRef.current.catch(() => {}).then(() => runSave({ autosave }));
    saveChainRef.current = run;
    return run;
  };
  saveRef.current = () => saveNow().catch(() => {}); // Ctrl+S / retry

  // Autosave after a pause in editing; retry a failed save every 10s.
  useEffect(() => {
    if (saveStatus !== 'dirty' && saveStatus !== 'error') return undefined;
    const t = setTimeout(() => saveNow({ autosave: true }).catch(() => {}), saveStatus === 'error' ? 10000 : 1500);
    return () => clearTimeout(t);
  }, [saveStatus, lastChangeTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async () => {
    if (publishSaving) return;
    setPublishSaving(true);
    try {
      // Save first (waits for any in-flight save) — never publish stale drafts
      await saveNow();
      await api.post(`/web/${pageSlug}/publish`);
      setHasPublishedSnapshot(true);
      setIsPublished(true);
      toast('Page published', 'success');
    } catch (error) {
      console.error('Failed to publish page:', error);
      toast('Failed to publish page. Please try again.', 'error');
    } finally {
      setPublishSaving(false);
    }
  };

  // Mode switches are instant: the old View Transition + 320ms slide-in left
  // the canvas unclickable (and moving) for ~1s after pressing Edit.
  const transitionToViewMode = useCallback((nextMode) => {
    setViewMode(nextMode);
  }, []);

  // Exit = make sure everything is saved, then back to the Pages list.
  // (No "discard" step: edits autosave as a draft; undo and version history
  // cover mistakes, and nothing goes live until Publish.)
  const handleExitEdit = async () => {
    try {
      await saveNow();
    } catch {
      const ok = await confirmDialog({
        title: "Couldn't save your latest changes",
        message: 'Your most recent edits could not be saved. Leave anyway and lose them?',
        confirmLabel: 'Leave without saving',
        cancelLabel: 'Stay',
        variant: 'warning',
      });
      if (!ok) return;
    }
    navigate('/hub-admin/web/pages');
  };

  const applyHistoryEntry = (state) => {
    setSections(state.sections);
    if (state.header) setHeader(state.header);
    if (state.footer) setFooter(state.footer);
    markDirty();
    // Drop selected blocks that no longer exist in the restored state
    setSelectedBlockIds((prev) => {
      if (prev.size === 0) return prev;
      const allBlockIds = new Set((state.sections || []).flatMap((s) => (s.blocks || []).map((b) => b.id)));
      const surviving = new Set([...prev].filter((id) => allBlockIds.has(id)));
      return surviving.size === prev.size ? prev : surviving;
    });
  };

  const handleUndo = () => {
    flushPendingHistory();
    const h = historyRef.current;
    if (h.index <= 0) return;
    h.index -= 1;
    syncHistoryState();
    applyHistoryEntry(h.entries[h.index]);
  };

  const handleRedo = () => {
    flushPendingHistory();
    const h = historyRef.current;
    if (h.index >= h.entries.length - 1) return;
    h.index += 1;
    syncHistoryState();
    applyHistoryEntry(h.entries[h.index]);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      // Ctrl/Cmd + S: Save — works everywhere, including while typing
      // (otherwise the browser's "Save page" dialog opens).
      if (mod && key === 's') {
        e.preventDefault();
        saveRef.current();
        return;
      }

      // Text entry keeps its native undo, arrows, Delete, etc.
      if (isTextEntryTarget(e.target)) return;

      // Ctrl/Cmd + Z: Undo · Ctrl/Cmd + Shift + Z or Ctrl + Y: Redo
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Escape: close pickers, otherwise walk the selection up one level
      // (text editing → block is handled by the text field itself;
      //  block → its section → nothing).
      if (e.key === 'Escape') {
        if (blockPaletteTarget || addSectionAfterIndex !== null) {
          setBlockPaletteTarget(null);
          setAddSectionAfterIndex(null);
        } else if (selectedBlockIds.size > 0) {
          const sIdx = sections.findIndex((sec) => (sec.blocks || []).some((b) => selectedBlockIds.has(b.id)));
          if (sIdx >= 0) selectSection(sIdx); else clearSelection();
        } else if (selectedSectionIndex !== null) {
          clearSelection();
        }
        return;
      }

      // Single-key shortcuts below must not fire while a button, menu or
      // dialog has focus (e.g. Delete on a focused <select> deleted the block).
      if (isTypingTarget(e.target)) return;

      // Arrow keys: Nudge selected block(s) by 1 grid cell (Shift = 3 cells)
      // (desktop grid only — phone layouts are usually auto-stacked)
      if (selectedBlockIds.size > 0 && viewport !== 'mobile' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 3 : 1;
        const isMobile = viewport === 'mobile';
        const newSections = sections.map((sec) => {
          const gridColumns = isMobile ? 6 : (sec.fluidConfig?.gridColumns || 24);
          const blocks = (sec.blocks || []).map((block) => {
            if (!selectedBlockIds.has(block.id)) return block;
            const fluidKey = isMobile ? 'fluidMobile' : 'fluid';
            const defaultFluid = isMobile
              ? { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 3, zIndex: 0 }
              : { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 3, zIndex: 0 };
            const fluid = block[fluidKey] || defaultFluid;
            let { colStart, colEnd, rowStart, rowEnd } = fluid;
            if (e.key === 'ArrowLeft')  { colStart = Math.max(1, colStart - step); colEnd = colStart + (fluid.colEnd - fluid.colStart); }
            if (e.key === 'ArrowRight') { colEnd = Math.min(gridColumns + 1, colEnd + step); colStart = colEnd - (fluid.colEnd - fluid.colStart); }
            if (e.key === 'ArrowUp')    { rowStart = Math.max(1, rowStart - step); rowEnd = rowStart + (fluid.rowEnd - fluid.rowStart); }
            if (e.key === 'ArrowDown')  { rowEnd = rowEnd + step; rowStart = rowEnd - (fluid.rowEnd - fluid.rowStart); }
            return { ...block, [fluidKey]: { ...fluid, colStart, colEnd, rowStart, rowEnd } };
          });
          return { ...sec, blocks };
        });
        setSections(newSections);
        saveToHistory(newSections, header, footer);
      }

      // Delete/Backspace: Delete selected block(s)
      if (selectedBlockIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        const newSections = sections.map((sec) => ({
          ...sec,
          blocks: (sec.blocks || []).filter((b) => !selectedBlockIds.has(b.id)),
        }));
        setSections(newSections);
        saveToHistory(newSections, header, footer);
        setSelectedBlockIds(new Set());
      }

      // Ctrl/Cmd + P: Preview
      if (mod && key === 'p') {
        e.preventDefault();
        window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank');
      }

      // + : Add section
      if (e.key === '+' && !mod) {
        e.preventDefault();
        setAddSectionAfterIndex(sections.length - 1);
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !mod) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sections, selectedBlockIds, selectedSectionIndex, blockPaletteTarget, addSectionAfterIndex, header, footer, viewport]);

  const saveToHistory = (newSections, newHeader, newFooter) => {
    flushPendingHistory(); // keep typing entries ordered before this one
    pushHistoryEntry({ sections: newSections, header: newHeader, footer: newFooter });
    setLastChangeTime(Date.now());
    // Mark unsaved — but don't overwrite an in-flight saving/error status
    markDirty();
  };

  // Debounced history commit for typing — groups rapid contentEditable
  // changes into one history entry after ~800ms of idle.
  const saveToHistoryDebounced = (newSections, newHeader, newFooter) => {
    // Update state immediately, but defer the history push
    setSections(newSections);
    setLastChangeTime(Date.now());
    markDirty();
    pendingHistoryRef.current = { sections: newSections, header: newHeader, footer: newFooter };
    clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(flushPendingHistory, 800);
  };

  // —— Section-level operations ————————————————————————————————————————————————

  // Newly inserted blocks fit themselves to their content once rendered
  // (FluidBlock autoFit). Tracked briefly by id; loading a page never fits.
  const justAddedRef = useRef(new Set());
  const markJustAdded = (ids) => {
    ids.forEach((id) => justAddedRef.current.add(id));
    setTimeout(() => ids.forEach((id) => justAddedRef.current.delete(id)), 1500);
  };
  const isJustAdded = useCallback((id) => justAddedRef.current.has(id), []);

  /** Bring a freshly inserted block/section into view. */
  const revealAfterRender = (selector) => {
    setTimeout(() => document.querySelector(selector)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  };

  /** Insert a ready-made section (from the section picker) after `afterIndex`. */
  const addSectionFromTemplate = (template, afterIndex) => {
    const newSection = sectionFromTemplate(template);
    const insertAt = afterIndex == null ? sections.length : afterIndex + 1;
    const newSections = [...sections.slice(0, insertAt), newSection, ...sections.slice(insertAt)];
    markJustAdded(newSection.blocks.map((b) => b.id));
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    setAddSectionAfterIndex(null);
    selectSection(insertAt);
    revealAfterRender(`[role="group"][aria-label^="Section ${insertAt + 1}"]`);
  };

  const deleteSection = (sIdx) => {
    const deletedSection = sections[sIdx];
    if (!deletedSection) return;
    const newSections = sections.filter((_, i) => i !== sIdx);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    // Undo toast — same as Ctrl+Z when nothing else changed since the delete,
    // otherwise re-insert the section at its original position.
    const deleteEntryIndex = historyRef.current.index;
    toast('Section deleted', {
      type: 'info',
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          flushPendingHistory();
          if (historyRef.current.index === deleteEntryIndex) {
            handleUndo();
          } else {
            const latest = historyRef.current.entries[historyRef.current.index];
            const base = latest?.sections ?? [];
            const restored = [...base.slice(0, sIdx), deletedSection, ...base.slice(sIdx)];
            setSections(restored);
            saveToHistory(restored, latest?.header ?? header, latest?.footer ?? footer);
          }
          setAnnouncement('Section restored');
        },
      },
    });
    setAnnouncement(`Section ${sIdx + 1} deleted`);
  };

  const duplicateSection = (sIdx) => {
    const sec = sections[sIdx];
    const newSec = duplicateSectionEntity(sec);
    const newSections = [...sections.slice(0, sIdx + 1), newSec, ...sections.slice(sIdx + 1)];
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  const moveSection = (sIdx, direction) => {
    const newIdx = sIdx + direction;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[sIdx], newSections[newIdx]] = [newSections[newIdx], newSections[sIdx]];
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  const updateSection = (sIdx, updates) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, ...updates } : s);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  // —— Block-level operations (within a section) ———————————————————————————————

  const updateSectionBlocks = (sIdx, newBlocks) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  /**
   * Add a block from the block picker. `row` null → bottom of the section;
   * otherwise (dropped on the page) it goes in at that row and blocks at or
   * below it move down to make room — never on top of another block.
   */
  const addBlockToSection = (sIdx, type, row = null) => {
    let targetIdx = sIdx;
    let workingSections = sections;
    if (!sections[targetIdx]) {
      // No sections yet — create a blank one to hold the block.
      const blank = createSection({ fluidConfig: { ...DEFAULT_SECTION.fluidConfig } });
      workingSections = [...sections, blank];
      targetIdx = workingSections.length - 1;
    }
    const sec = workingSections[targetIdx];
    const blocks = sec.blocks || [];
    const gridColumns = sec.fluidConfig?.gridColumns || 24;
    const rows = blockCatalogEntry(type)?.rows ?? 2;
    let newBlocks;
    let newBlock;
    if (row == null) {
      newBlock = createBlock(type, { fluid: autoStackFluid(blocks, gridColumns, rows) });
      newBlocks = [...blocks, newBlock];
    } else {
      // Don't split a block: if the row is inside one, insert below it.
      const at = blocks.reduce((r, b) => {
        const f = b.fluid || {};
        return (f.rowStart < r && f.rowEnd > r) ? Math.max(r, f.rowEnd) : r;
      }, row);
      newBlock = createBlock(type, { fluid: { colStart: 1, colEnd: gridColumns + 1, rowStart: at, rowEnd: at + rows, zIndex: 0 } });
      newBlocks = [
        ...blocks.map((b) => {
          const f = b.fluid || {};
          return f.rowStart >= at ? { ...b, fluid: { ...f, rowStart: f.rowStart + rows, rowEnd: f.rowEnd + rows } } : b;
        }),
        newBlock,
      ];
    }
    const newSections = workingSections.map((s, i) => (i === targetIdx ? { ...s, blocks: newBlocks } : s));
    markJustAdded([newBlock.id]);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    setBlockPaletteTarget(null);
    handleSelectBlock(newBlock.id);
    revealAfterRender(`[data-block-id="${newBlock.id}"]`);
  };

  const updateBlock = (sIdx, bIdx, updates) => {
    const sec = sections[sIdx];
    const newBlocks = (sec.blocks || []).map((b, i) => i === bIdx ? { ...b, ...updates } : b);
    updateSectionBlocks(sIdx, newBlocks);
  };

  const updateBlockContent = (sIdx, bIdx, contentUpdates) => {
    const sec = sections[sIdx];
    const newBlocks = (sec.blocks || []).map((b, i) => {
      if (i !== bIdx) return b;
      return { ...b, content: { ...b.content, ...contentUpdates } };
    });
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
    // Use debounced history for content changes (typing) to group keystrokes
    saveToHistoryDebounced(newSections, header, footer);
  };

  const deleteBlock = (sIdx, bIdx) => {
    const sec = sections[sIdx];
    const deletedBlock = sec?.blocks?.[bIdx];
    if (!deletedBlock) return;
    updateSectionBlocks(sIdx, (sec.blocks || []).filter((_, i) => i !== bIdx));
    // Undo toast — same as Ctrl+Z when nothing else changed since the delete,
    // otherwise re-insert the block at its original position.
    const deleteEntryIndex = historyRef.current.index;
    toast('Block deleted', {
      type: 'info',
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          flushPendingHistory();
          if (historyRef.current.index === deleteEntryIndex) {
            handleUndo();
          } else {
            const latest = historyRef.current.entries[historyRef.current.index];
            const base = latest?.sections ?? [];
            const restored = base.map((s, i) => {
              if (i !== sIdx) return s;
              const blocks = s.blocks || [];
              return { ...s, blocks: [...blocks.slice(0, bIdx), deletedBlock, ...blocks.slice(bIdx)] };
            });
            setSections(restored);
            saveToHistory(restored, latest?.header ?? header, latest?.footer ?? footer);
          }
          setAnnouncement('Block restored');
        },
      },
    });
    setAnnouncement(`Block deleted from section ${sIdx + 1}`);
  };

  const duplicateBlock = (sIdx, bIdx) => {
    const sec = sections[sIdx];
    const block = sec.blocks[bIdx];
    const newBlock = duplicateBlockEntity(block);
    const newBlocks = [...sec.blocks.slice(0, bIdx + 1), newBlock, ...sec.blocks.slice(bIdx + 1)];
    updateSectionBlocks(sIdx, newBlocks);
  };

  const moveBlock = (sIdx, bIdx, direction) => {
    const sec = sections[sIdx];
    if (!sec?.blocks) return;
    const newIdx = bIdx + direction;
    if (newIdx < 0 || newIdx >= sec.blocks.length) return;
    const newBlocks = [...sec.blocks];
    [newBlocks[bIdx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[bIdx]];
    updateSectionBlocks(sIdx, newBlocks);
  };

  const addNestedBlock = (sIdx, parentBIdx, colIndex, type) => {
    const sec = sections[sIdx];
    const block = sec.blocks[parentBIdx];
    const items = [...(block.content.items || [])];
    const column = items[colIndex] || { width: '33.33%', blocks: [] };
    column.blocks = [...column.blocks, { type, content: makeDefaultBlockContent(type) }];
    items[colIndex] = column;
    updateBlockContent(sIdx, parentBIdx, { items });
  };

  const renderEditableBlock = (block, sIdx, bIdx) => (
    <BlockContent
      block={block}
      EditableText={EditableText}
      EditableButton={EditableButton}
      EditableImage={EditableImage}
      onUpdateContent={(updates) => updateBlockContent(sIdx, bIdx, updates)}
      onUpdateBlock={(updates) => updateBlock(sIdx, bIdx, updates)}
      onAddNestedBlock={(colIndex, type) => addNestedBlock(sIdx, bIdx, colIndex, type)}
    />
  );

  // ── Error state: fetch failed — show retry + back to pages ───────────────
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised p-6">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-modal p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-danger" />
          </div>
          <h2 className="text-xl font-semibold text-text-base mb-2">Couldn't load page</h2>
          <p className="text-sm text-muted mb-6">{fetchError.message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchPage()}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px]"
            >
              Retry
            </button>
            <a
              href="/hub-admin/web/pages"
              className="px-4 py-2 text-sm font-medium text-text-base bg-surface border border-border rounded-lg hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary min-h-[44px] inline-flex items-center"
            >
              Back to Pages
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary-light rounded-full mb-4"></div>
          <div className="h-4 bg-border rounded w-32"></div>
        </div>
      </div>
    );
  }

  const deviceClasses = {
    desktop: 'w-full',
    tablet: 'max-w-2xl mx-auto border-x-4 border-border shadow-dropdown',
    mobile: 'max-w-md mx-auto border-x-4 border-border shadow-dropdown'
  };

  // ── Live view mode: renders the actual public site (read-only) ──────────
  if (viewMode === 'live') {
    // Build a preview payload from the editor's current state so the live
    // view reflects unpublished draft edits, not just the saved DB row.
    const previewData = {
      ...pageData,
      sections,
      header,
      footer,
      // Keep siteStyle / title / template coming from the fetched page so the
      // public renderer has the same tokens & chrome as the real site.
      siteStyle: pageData?.siteStyle,
      title: pageData?.title,
      template: pageData?.template,
    };

    return (
      <div className="min-h-screen bg-surface">
        {/* Minimal live view toolbar */}
        <div className="bg-surface border-b border-border px-6 py-3 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Edit button — top left */}
              <button
                onClick={() => transitionToViewMode('edit')}
                className="px-5 py-2 min-h-[40px] bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover flex items-center gap-2 transition-colors font-medium text-sm shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Back to editor
              </button>
              {/* Publish status badge */}
              {hasPublishedSnapshot && isPublished && (
                <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Published
                </span>
              )}
              {!hasPublishedSnapshot && (
                <span className="flex items-center gap-1.5 text-xs text-muted bg-surface-raised px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                  Not yet published
                </span>
              )}
              {hasPublishedSnapshot && !isPublished && (
                <span className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Unpublished
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live preview — render the actual public site */}
        <div className="bg-surface">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <p className="text-muted">This page has no content yet</p>
              <button
                onClick={() => transitionToViewMode('edit')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
              >
                <Edit3 className="w-5 h-5" />
                Back to editor
              </button>
            </div>
          ) : (
            <PublicHome previewMode previewData={previewData} />
          )}
        </div>
      </div>
    );
  }

  // What the inspector shows: the first selected block, else the selected section.
  const inspectorSelection = (() => {
    const isMobileView = viewport === 'mobile';
    if (selectedBlockIds.size > 0) {
      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const blocks = sections[sIdx].blocks || [];
        const bIdx = blocks.findIndex((b) => selectedBlockIds.has(b.id));
        if (bIdx >= 0) {
          const columns = isMobileView ? MOBILE_GRID_COLUMNS : (sections[sIdx].fluidConfig?.gridColumns || 24);
          const placement = isMobileView
            ? mobilePlacements(blocks)[bIdx]
            : { colStart: 1, colEnd: columns + 1, rowStart: 1, rowEnd: 3, zIndex: 0, ...(blocks[bIdx].fluid || {}) };
          return {
            kind: 'block', sIdx, bIdx, block: blocks[bIdx], placement, columns,
            mobileAuto: isMobileView && isMobileAuto(blocks),
          };
        }
      }
    }
    if (selectedSectionIndex !== null && sections[selectedSectionIndex]) {
      return { kind: 'section', sIdx: selectedSectionIndex, section: sections[selectedSectionIndex] };
    }
    return null;
  })();

  // ── Edit mode: full-screen overlay editor ──────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-surface-raised overflow-y-auto">
      <EditorToolbar
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        saveRef={saveRef}
        onExit={handleExitEdit}
        onPreview={() => transitionToViewMode('live')}
        pageTitle={pageData?.title}
        pageSlug={pageSlug}
        hasPublishedSnapshot={hasPublishedSnapshot}
        isPublished={isPublished}
        viewport={viewport}
        previewDevice={previewDevice}
        onBreakpointChange={(bp) => {
          if (bp === 'mobile') {
            setViewport('mobile');
            setPreviewDevice('mobile');
          } else if (bp === 'tablet') {
            setViewport('desktop');
            setPreviewDevice('tablet');
          } else {
            setViewport('desktop');
            setPreviewDevice('desktop');
          }
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyRef.current.index > 0 || !!pendingHistoryRef.current}
        canRedo={historyRef.current.index < historyRef.current.entries.length - 1}
        onPublish={handlePublish}
        publishSaving={publishSaving}
        onSaveTemplate={async () => {
          const name = window.prompt('Name this reusable page template:', pageData?.title || pageSlug);
          if (!name?.trim() || templateSaving) return;
          setTemplateSaving(true);
          try {
            await api.post('/web/page-templates', { name: name.trim(), snapshot: { template: pageData?.template, header, footer, sections } });
            toast('Template saved', 'success');
          } catch (error) {
            console.error('Failed to save page template:', error);
            toast('Failed to save template. Please try again.', 'error');
          } finally {
            setTemplateSaving(false);
          }
        }}
        templateSaving={templateSaving}
        onShowVersionHistory={() => setShowVersionHistory(true)}
        onShowKeyboardHelp={() => setShowKeyboardHelp(true)}
        onToggleLayersPanel={() => setShowLayersPanel(s => !s)}
        showLayersPanel={showLayersPanel}
        toast={toast}
      />

      {showVersionHistory && (
        <WebVersionHistoryPanel
          slug={pageSlug}
          onClose={() => setShowVersionHistory(false)}
          onRestored={(page) => {
            // The server has already restored this version, so it's the new
            // saved baseline (not dirty) and the new undo starting point.
            const restored = {
              sections: page?.sections || [],
              header: page?.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} },
              footer: page?.footer || { sections: [], copyright: '', styles: {} },
            };
            if (page) setPageData((prev) => ({ ...page, siteStyle: page.siteStyle ?? prev?.siteStyle, nav: page.nav ?? prev?.nav }));
            setSections(restored.sections);
            setHeader(restored.header);
            setFooter(restored.footer);
            savedSnapshotRef.current = restored;
            savedSeqRef.current = changeSeqRef.current; // server already has it
            resetHistory(restored);
            setSelectedBlockIds(new Set());
            setSaveStatus('clean');
            setLastChangeTime(0);
            setShowVersionHistory(false);
          }}
        />
      )}

      {/* Main editor area — sections + optional layers panel */}
      <div className="flex min-h-screen">
        {/* Add-block panel (docked so blocks can be dragged onto the page) */}
        {blockPaletteTarget !== null && (
          <BlockPicker
            targetSectionIndex={blockPaletteTarget.sectionIndex}
            sectionCount={sections.length}
            onAdd={(type, sIdx, row) => addBlockToSection(sIdx, type, row)}
            onClose={() => setBlockPaletteTarget(null)}
          />
        )}
        {showLayersPanel && (
          <LayersPanel
            sections={sections}
            selectedBlockIds={selectedBlockIds}
            onSelectSection={(sIdx) => { setSelectedBlockIds(new Set()); }}
            onSelectBlock={(sIdx, bIdx) => {
              const block = sections[sIdx]?.blocks?.[bIdx];
              if (block) setSelectedBlockIds(new Set([block.id]));
            }}
            onMoveSection={moveSection}
            onDuplicateSection={duplicateSection}
            onDeleteSection={deleteSection}
            onMoveBlock={moveBlock}
            onDuplicateBlock={duplicateBlock}
            onDeleteBlock={deleteBlock}
            onClose={() => setShowLayersPanel(false)}
          />
        )}
        <div className="flex-1">
          <div className={`min-h-screen ${(previewDevice !== 'desktop' || viewport === 'mobile') ? 'py-8' : ''}`}>
            <div className={`${deviceClasses[previewDevice]} min-h-screen bg-surface ${previewDevice !== 'desktop' ? 'rounded-xl overflow-hidden' : ''} ${viewport === 'mobile' ? 'max-w-md mx-auto border-x-4 border-border shadow-dropdown' : ''}`}>

              {/* ── Layout grid canvas ────────────────────────────────────────
                  Rendered inside the real site theme (.public-site) with the
                  same block components as the published page, so what you
                  edit is what visitors see. Each section is a 24-column CSS
                  grid; blocks are dragged/resized on it. Press "G" to toggle
                  the grid overlay. Editor chrome opts back into admin styling
                  with .site-editor-chrome.
              */}
              <div className="public-site site-editor min-h-screen bg-surface text-text-base" style={siteThemeStyle(siteTokens)}>
              <SiteFrame label="Header" note="Shared across all pages">
                <SiteHeader pageData={{ ...pageData, header, footer }} currentPath={pageSlug === 'home' ? '/' : `/${pageSlug}`} sticky={false} />
              </SiteFrame>

              {/* Empty state */}
              {sections.length === 0 && (
                <div className="site-editor-chrome flex flex-col items-center justify-center min-h-[60vh] gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center">
                    <Rows3 className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-text-base mb-2">Start building your page</h2>
                    <p className="text-muted mb-6">Add your first section to get started</p>
                    <button
                      onClick={() => setAddSectionAfterIndex(-1)}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-lg font-semibold text-lg"
                    >
                      <Plus className="w-6 h-6" />
                      Add Section
                    </button>
                  </div>
                </div>
              )}

              {/* Fluid sections */}
              {sections.map((section, sIdx) => (
                <FluidSection
                  key={section.id || sIdx}
                  section={section}
                  sectionIndex={sIdx}
                  selected={selectedSectionIndex === sIdx}
                  onSelectSection={selectSection}
                  onOpenInspector={() => setInspectorOpen(true)}
                  isLastSection={sIdx === sections.length - 1}
                  selectedBlockIds={selectedBlockIds}
                  onSelectBlock={handleSelectBlock}
                  onClearSelection={clearSelection}
                  onUpdateBlock={updateBlock}
                  onUpdateBlockContent={updateBlockContent}
                  onUpdateSection={updateSection}
                  onDeleteBlock={deleteBlock}
                  onDuplicateBlock={duplicateBlock}
                  onAddBlock={(sIdx) => setBlockPaletteTarget({ sectionIndex: sIdx })}
                  onDropBlock={(sIdx, type, row) => addBlockToSection(sIdx, type, row)}
                  isJustAdded={isJustAdded}
                  onDeleteSection={deleteSection}
                  onDuplicateSection={duplicateSection}
                  onMoveSectionUp={(i) => moveSection(i, -1)}
                  onMoveSectionDown={(i) => moveSection(i, 1)}
                  onAddSectionBelow={(i) => setAddSectionAfterIndex(i)}
                  onAddNestedBlock={(sIdx, bIdx, colIndex, type) => addNestedBlock(sIdx, bIdx, colIndex, type)}
                  readOnly={false}
                  viewport={viewport}
                />
              ))}

              {/* Bottom add-section hint */}
              {sections.length > 0 && (
                <div className="site-editor-chrome py-8 text-center">
                  <button
                    onClick={() => setAddSectionAfterIndex(sections.length - 1)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-surface-raised border border-border text-muted hover:text-primary hover:border-primary rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Section
                  </button>
                  <p className="text-xs text-muted mt-2">
                    or press <kbd className="px-2 py-0.5 bg-surface-tertiary rounded text-xs font-mono">+</kbd> to add a section
                  </p>
                </div>
              )}

              <SiteFrame label="Footer" note="Shared across all pages">
                <SiteFooter pageData={{ ...pageData, header, footer }} />
              </SiteFrame>
              </div>
            </div>
          </div>
        </div>
        {/* Inspector — settings for the selected block or section */}
        {inspectorOpen && (
          <EditorInspector
            selection={inspectorSelection}
            isMobile={viewport === 'mobile'}
            onUpdateBlockContent={updateBlockContent}
            onUpdateBlock={updateBlock}
            onUpdateSection={updateSection}
            onClose={() => setInspectorOpen(false)}
          />
        )}
      </div>

      {/* Add-section picker (ready-made sections) */}
      {addSectionAfterIndex !== null && (
        <SectionPicker
          siteTokens={siteTokens}
          onAdd={(template) => addSectionFromTemplate(template, addSectionAfterIndex)}
          onClose={() => setAddSectionAfterIndex(null)}
        />
      )}

      {/* Keyboard shortcuts help */}
      <EditorDialogs
        showKeyboardHelp={showKeyboardHelp}
        onCloseKeyboardHelp={() => setShowKeyboardHelp(false)}
      />

      {/* Accessible confirm dialog mount (dirty-exit protection) */}
      {ConfirmDialogMount}
      {/* Toast notifications (delete undo, etc.) */}
      {ToastMount}
      {/* Screen-reader-only live region for announcements (selection, deletion, etc.) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  );
}
