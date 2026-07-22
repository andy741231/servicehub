import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus, Type, X, Edit3, Copy, Sparkles, Rows3, History, Eye, AlertCircle, Layers,
} from 'lucide-react';
import api from '../../../utils/api';
import { useConfirm, AccessibleModal } from '../../../components/Dialog';
import { useToast } from '../../../components/Toast';
import EditorToolbar from './EditorToolbar';
import EditorDialogs from './EditorDialogs';
import LayersPanel from './LayersPanel';
import MobileLayoutInspector from './MobileLayoutInspector';
import WebVersionHistoryPanel from '../WebVersionHistoryPanel';
import { resolveUrl, BLOCK_TYPES, DEFAULT_SECTION, makeDefaultBlockContent, SECTION_LAYOUTS, SPACING_PRESETS, createBlock, createSection, duplicateBlock as duplicateBlockEntity, duplicateSection as duplicateSectionEntity, autoStackFluid } from './editorUtils';
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
import FluidSection from './fluid/FluidSection.jsx';
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
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [announcement, setAnnouncement] = useState(''); // screen-reader-only live region
  const [templateSaving, setTemplateSaving] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'edit'
  const [transitionDirection, setTransitionDirection] = useState(null); // 'enter' | 'exit' | null
  const [isExiting, setIsExiting] = useState(false);
  const [hasPublishedSnapshot, setHasPublishedSnapshot] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'mobile'
  const saveRef = useRef();
  const [selectedBlockIds, setSelectedBlockIds] = useState(() => new Set());

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
  const isDirty = saveStatus === 'dirty' || saveStatus === 'error';
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
    setSelectedBlockIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedBlockIds(new Set()), []);

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
      setHistory([initialState]);
      setHistoryIndex(0);
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


  // Save function ref to avoid stale closures and dependency issues
  saveRef.current = async () => {
    if (saveStatus === 'saving') return;
    // No-op if there are no unsaved changes
    if (saveStatus === 'clean' || saveStatus === 'saved') return;

    try {
      setSaveStatus('saving');
      const { data } = await api.put(`/web/${pageSlug}`, {
        header,
        footer,
        sections: sections.map((sec, sIdx) => ({
          ...sec,
          order: sIdx,
          blocks: (sec.blocks || []).map((b, bIdx) => ({ ...b, order: bIdx })),
        })),
      });
      setPageData(data);
      const savedAt = new Date();
      setLastSavedAt(savedAt);
      setSaveStatus('saved');
      // After 2s, transition from "Saved" (green) to "clean" (muted) — still truthful
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'clean' : s)), 2000);
    } catch (error) {
      console.error('Failed to save page:', error);
      // Stay in 'error' until the user explicitly retries — no auto-clear
      setSaveStatus('error');
    }
  };

  const handlePublish = async () => {
    if (publishSaving) return;
    setPublishSaving(true);
    try {
      // Save first — never publish stale draft state
      if (saveStatus === 'dirty' || saveStatus === 'error') {
        await new Promise((resolve, reject) => {
          const prev = saveStatus;
          setSaveStatus('saving');
          api.put(`/web/${pageSlug}`, {
            header,
            footer,
            sections: sections.map((sec, sIdx) => ({
              ...sec,
              order: sIdx,
              blocks: (sec.blocks || []).map((b, bIdx) => ({ ...b, order: bIdx })),
            })),
          })
            .then(({ data }) => {
              setPageData(data);
              setLastSavedAt(new Date());
              setSaveStatus('clean');
              resolve();
            })
            .catch((err) => {
              console.error('Failed to save before publish:', err);
              setSaveStatus('error');
              reject(err);
            });
          void prev;
        });
      }
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

  const transitionToViewMode = useCallback((nextMode) => {
    if (nextMode === viewMode) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTransitionDirection(nextMode === 'edit' ? 'enter' : 'exit');
    setIsExiting(false);
    if (document.startViewTransition && !prefersReducedMotion) {
      document.startViewTransition(() => setViewMode(nextMode));
      return;
    }
    setViewMode(nextMode);
  }, [viewMode]);

  const handleExitEdit = async () => {
    // Confirm before discarding unsaved changes
    if (saveStatus === 'dirty' || saveStatus === 'error') {
      const ok = await confirmDialog({
        title: 'Exit without saving?',
        message: 'You have unsaved changes that will be lost when you exit edit mode.',
        confirmLabel: 'Exit without saving',
        cancelLabel: 'Stay and save',
        variant: 'warning',
      });
      if (!ok) return;
      // Reset save status since the user explicitly chose to discard
      setSaveStatus('clean');
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      transitionToViewMode('live');
      return;
    }
    setTransitionDirection('exit');
    setIsExiting(true);
    setTimeout(() => {
      setViewMode('live');
      setIsExiting(false);
    }, 320);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setSections(state.sections);
      setHeader(state.header || header);
      setFooter(state.footer || footer);
      setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
      // Clear selection if selected blocks no longer exist in the restored state
      if (selectedBlockIds.size > 0) {
        const allBlockIds = new Set((state.sections || []).flatMap((s) => (s.blocks || []).map((b) => b.id)));
        const surviving = new Set([...selectedBlockIds].filter((id) => allBlockIds.has(id)));
        if (surviving.size !== selectedBlockIds.size) setSelectedBlockIds(surviving);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setSections(state.sections);
      setHeader(state.header || header);
      setFooter(state.footer || footer);
      setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
      // Clear selection if selected blocks no longer exist in the restored state
      if (selectedBlockIds.size > 0) {
        const allBlockIds = new Set((state.sections || []).flatMap((s) => (s.blocks || []).map((b) => b.id)));
        const surviving = new Set([...selectedBlockIds].filter((id) => allBlockIds.has(id)));
        if (surviving.size !== selectedBlockIds.size) setSelectedBlockIds(surviving);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveRef.current();
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      // Escape: Close modals/dropdowns
      if (e.key === 'Escape') {
        setBlockPaletteTarget(null);
        setAddSectionAfterIndex(null);
      }

      // Arrow keys: Nudge selected block(s) by 1 grid cell (Shift = 3 cells)
      if (selectedBlockIds.size > 0 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank');
      }

      // + : Add section
      if (e.key === '+') {
        e.preventDefault();
        setAddSectionAfterIndex(sections.length - 1);
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, sections, selectedBlockIds, header, footer, viewport]);

  const MAX_HISTORY = 50; // Bound history to prevent memory growth
  const saveToHistory = (newSections, newHeader, newFooter) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ sections: newSections, header: newHeader, footer: newFooter });
    // Bound: drop oldest entries if exceeding MAX_HISTORY
    while (newHistory.length > MAX_HISTORY) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLastChangeTime(Date.now());
    // Mark unsaved — but don't overwrite an in-flight saving/error status
    setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
  };

  // Debounced history commit for typing — groups rapid contentEditable
  // changes into a single history entry per ~800ms idle interval.
  const pendingHistoryRef = useRef(null);
  const saveToHistoryDebounced = useCallback((newSections, newHeader, newFooter) => {
    // Update state immediately, but defer the history push
    setSections(newSections);
    setLastChangeTime(Date.now());
    setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));
    // Store the latest state; the timeout will commit it
    pendingHistoryRef.current = { sections: newSections, header: newHeader, footer: newFooter };
    if (!window.__webEditorHistoryTimer) {
      window.__webEditorHistoryTimer = setTimeout(() => {
        if (pendingHistoryRef.current) {
          const { sections: s, header: h, footer: f } = pendingHistoryRef.current;
          pendingHistoryRef.current = null;
          saveToHistory(s, h, f);
        }
        window.__webEditorHistoryTimer = null;
      }, 800);
    }
  }, [history, historyIndex]);

  // —— Section-level operations ————————————————————————————————————————————————

  const addSection = (sectionConfig, afterIndex) => {
    const newSection = createSection(sectionConfig);
    const insertAt = afterIndex == null ? sections.length : afterIndex + 1;
    const newSections = [...sections.slice(0, insertAt), newSection, ...sections.slice(insertAt)];
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    setAddSectionAfterIndex(null);
  };

  const deleteSection = (sIdx) => {
    const deletedSection = sections[sIdx];
    if (!deletedSection) return;
    const newSections = sections.filter((_, i) => i !== sIdx);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    // Undo toast — restore the section at its original position
    toast('Section deleted', {
      type: 'info',
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          setSections((prev) => {
            const restored = [...prev.slice(0, sIdx), deletedSection, ...prev.slice(sIdx)];
            saveToHistory(restored, header, footer);
            return restored;
          });
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

  const addBlockToSection = (sIdx, type) => {
    const sec = sections[sIdx];
    const gridColumns = sec.fluidConfig?.gridColumns || 24;
    const fluid = autoStackFluid(sec.blocks || [], gridColumns);
    const newBlock = createBlock(type, { fluid });
    updateSectionBlocks(sIdx, [...(sec.blocks || []), newBlock]);
    setBlockPaletteTarget(null);
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
    // Undo toast — restore the block at its original position
    toast('Block deleted', {
      type: 'info',
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          setSections((prev) => prev.map((s, i) => {
            if (i !== sIdx) return s;
            const restoredBlocks = [...(s.blocks || []).slice(0, bIdx), deletedBlock, ...(s.blocks || []).slice(bIdx)];
            saveToHistory(prev.map((s2, j) => j === sIdx ? { ...s2, blocks: restoredBlocks } : s2), header, footer);
            return { ...s, blocks: restoredBlocks };
          }));
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
      <div className={`min-h-screen bg-surface ${transitionDirection === 'enter' ? 'editor-stage-live-exit' : transitionDirection === 'exit' ? 'editor-stage-live-enter' : ''}`} style={{ viewTransitionName: 'editor-stage' }}>
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
                Edit
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
                Start Editing
              </button>
            </div>
          ) : (
            <PublicHome previewMode previewData={previewData} />
          )}
        </div>
      </div>
    );
  }

  // ── Edit mode: full-screen overlay editor ──────────────────────────────
  return (
    <div className={`fixed inset-0 z-[100] bg-surface-raised overflow-y-auto ${isExiting ? 'editor-stage-edit-exit' : 'editor-stage-edit-enter'}`} style={{ viewTransitionName: 'editor-stage' }}>
      <EditorToolbar
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        saveRef={saveRef}
        onExit={handleExitEdit}
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
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
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
          onRestored={(restoredPage) => {
            // Restore from version history — marks dirty so user can save
            const restoredSections = restoredPage?.sections || [];
            setSections(restoredSections);
            setHeader(restoredPage?.header || header);
            setFooter(restoredPage?.footer || footer);
            setShowVersionHistory(false);
            setSaveStatus('dirty');
            // Reset history so the restored state is the new baseline
            setHistory([{ sections: restoredSections, header: restoredPage?.header || {}, footer: restoredPage?.footer || {} }]);
            setHistoryIndex(0);
          }}
          onRestored={(page) => {
            const restoredSections = page.sections || [];
            const restoredHeader = page.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} };
            const restoredFooter = page.footer || { sections: [], copyright: '', styles: {} };
            setPageData(page);
            setSections(restoredSections);
            setHeader(restoredHeader);
            setFooter(restoredFooter);
            setHistory([{ sections: restoredSections, header: restoredHeader, footer: restoredFooter }]);
            setHistoryIndex(0);
            setLastChangeTime(0);
          }}
        />
      )}

      {/* Main editor area — sections + optional layers panel */}
      <div className="flex min-h-screen">
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

              {/* ── Fluid Engine canvas ───────────────────────────────────────
                  Each section is a 24-column CSS Grid. Blocks are positioned
                  via grid coordinates (colStart/colEnd/rowStart/rowEnd) and
                  can be freely dragged, resized, and layered (zIndex).
                  Press "G" to toggle the grid overlay.
              */}

              {/* Empty state */}
              {sections.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
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
                  selectedBlockIds={selectedBlockIds}
                  onSelectBlock={handleSelectBlock}
                  onClearSelection={clearSelection}
                  onUpdateBlock={updateBlock}
                  onUpdateBlockContent={updateBlockContent}
                  onUpdateSection={updateSection}
                  onDeleteBlock={deleteBlock}
                  onDuplicateBlock={duplicateBlock}
                  onAddBlock={(sIdx) => setBlockPaletteTarget({ sectionIndex: sIdx })}
                  onDeleteSection={deleteSection}
                  onDuplicateSection={duplicateSection}
                  onMoveSectionUp={(i) => moveSection(i, -1)}
                  onMoveSectionDown={(i) => moveSection(i, 1)}
                  onAddSectionBelow={(i) => setAddSectionAfterIndex(i)}
                  EditableText={EditableText}
                  EditableButton={EditableButton}
                  EditableImage={EditableImage}
                  onAddNestedBlock={(sIdx, bIdx, colIndex, type) => addNestedBlock(sIdx, bIdx, colIndex, type)}
                  readOnly={false}
                  viewport={viewport}
                />
              ))}

              {/* Bottom add-section hint */}
              {sections.length > 0 && (
                <div className="py-8 text-center">
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


            </div>
          </div>
        </div>
        {/* Mobile layout inspector — shown when in mobile viewport with a selected block */}
        {viewport === 'mobile' && selectedBlockIds.size > 0 && (() => {
          // Find the first selected block and its section index
          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const sec = sections[sIdx];
            if (!sec?.blocks) continue;
            for (let bIdx = 0; bIdx < sec.blocks.length; bIdx++) {
              if (selectedBlockIds.has(sec.blocks[bIdx].id)) {
                const block = sec.blocks[bIdx];
                return (
                  <MobileLayoutInspector
                    block={block}
                    onUpdate={(fluidMobile) => updateSectionBlocks(sIdx, (blocks) => blocks.map((b, i) => i === bIdx ? { ...b, fluidMobile } : b))}
                    onClose={() => setSelectedBlockIds(new Set())}
                    onMoveUp={() => moveBlock(sIdx, bIdx, -1)}
                    onMoveDown={() => moveBlock(sIdx, bIdx, 1)}
                    canMoveUp={bIdx > 0}
                    canMoveDown={bIdx < (sec.blocks.length - 1)}
                  />
                );
              }
            }
          }
          return null;
        })()}
      </div>

      {/* Dialogs (Add Section, Add Block, Keyboard Help) */}
      <EditorDialogs
        addSectionAfterIndex={addSectionAfterIndex}
        onAddSection={addSection}
        onCloseAddSection={() => setAddSectionAfterIndex(null)}
        blockPaletteTarget={blockPaletteTarget}
        onAddBlock={addBlockToSection}
        onCloseBlockPalette={() => setBlockPaletteTarget(null)}
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
