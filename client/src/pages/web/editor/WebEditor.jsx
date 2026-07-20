import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus, Trash2, GripVertical, Image as ImageIcon, Eye,
  Palette, Type, Settings, Save, X, Check, AlertCircle, ChevronDown, ChevronUp,
  Link as LinkIcon, Edit3, Move, Copy, Upload,
  Zap, AlignLeft, AlignCenter, AlignRight, AlignJustify, Hand, Star, Sparkles, LayoutGrid, MessageSquare, Mail, Video, Columns,
  Bold, Italic, Rows3, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus, ExternalLink, HelpCircle, History
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../../utils/api';
import ColorPicker from '../../../components/ColorPicker';
import BuilderHistoryControls from '../../../components/builder/BuilderHistoryControls';
import BuilderPreviewControls from '../../../components/builder/BuilderPreviewControls';
import BuilderSaveStatus from '../../../components/builder/BuilderSaveStatus';
import RichTextEditor from '../../../components/RichTextEditor';
import WebVersionHistoryPanel from '../WebVersionHistoryPanel';
import { resolveUrl, BLOCK_TYPES, DEFAULT_SECTION, makeDefaultBlockContent, SECTION_LAYOUTS, SPACING_PRESETS } from './editorUtils';
import {
  BaseEditableText,
  TextToolbar,
  MarkdownContentEditor,
  HeroBlock,
  BaseEditableImage,
  BaseEditableButton,
  BackgroundImageDialog,
  EditableBlock,
  SliderBlockEditor,
  StructuredBlockEditor,
  AddSectionModal,
  SectionWrapper,
  AddBlockButton,
} from './editorComponents';
import BlockContent from './BlockContent';
import WebCraftRoot, { CraftCanvas } from './WebCraftRoot';
import SliderInspectorPanel from './SliderInspectorPanel';
export default function WebEditor() {
  const { slug: routeSlug } = useParams();
  const pageSlug = routeSlug || 'home';

  const [loading, setLoading] = useState(true);
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
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [isPublished, setIsPublished] = useState(true);
  const [publishSaving, setPublishSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);
  const saveRef = useRef();
  const craftHistoryRef = useRef(null);
  const USE_CRAFT = true; // Step 5.3 — Craft.js canvas engine

  // Wrapper components that notify parent of editing state
  const EditableText = useCallback((props) => (
    <BaseEditableText
      {...props}
      onEditingStart={() => { setIsEditing(true); props.onEditingStart?.(); }}
      onEditingEnd={(e) => {
        const next = e?.relatedTarget;
        if (!next?.closest('.field-toolbar')) {
          setIsEditing(false);
        }
        props.onEditingEnd?.(e);
      }}
    />
  ), []);

  const EditableImage = useCallback((props) => (
    <BaseEditableImage {...props} onEditingStart={() => setIsEditing(true)} onEditingEnd={() => setIsEditing(false)} />
  ), []);

  const EditableButton = useCallback((props) => (
    <BaseEditableButton {...props} onEditingStart={() => setIsEditing(true)} onEditingEnd={() => setIsEditing(false)} />
  ), []);

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
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

      const initialState = { sections: loadedSections, header: data.header || {}, footer: data.footer || {} };
      setHistory([initialState]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('Failed to fetch page data:', error);
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
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save page:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleUndo = () => {
    if (USE_CRAFT && craftHistoryRef.current?.canUndo?.()) {
      craftHistoryRef.current.undo();
      return;
    }
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setSections(state.sections);
      setHeader(state.header || header);
      setFooter(state.footer || footer);
    }
  };

  const handleRedo = () => {
    if (USE_CRAFT && craftHistoryRef.current?.canRedo?.()) {
      craftHistoryRef.current.redo();
      return;
    }
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setHistoryIndex(newIndex);
      setSections(state.sections);
      setHeader(state.header || header);
      setFooter(state.footer || footer);
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
  }, [history, historyIndex, sections]);

  // Auto-save with debounce - only when user is not actively editing and changes have been made
  useEffect(() => {
    if (isEditing || historyIndex < 0 || lastChangeTime === 0) return;

    const timer = setTimeout(() => {
      saveRef.current();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isEditing, historyIndex, lastChangeTime]);

  const saveToHistory = (newSections, newHeader, newFooter) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ sections: newSections, header: newHeader, footer: newFooter });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLastChangeTime(Date.now());
  };

  // —— Section-level operations ————————————————————————————————————————————————

  const addSection = (sectionConfig, afterIndex) => {
    const newSection = { ...DEFAULT_SECTION, ...sectionConfig, blocks: sectionConfig.blocks || [] };
    const insertAt = afterIndex == null ? sections.length : afterIndex + 1;
    const newSections = [...sections.slice(0, insertAt), newSection, ...sections.slice(insertAt)];
    setSections(newSections);
    if (!USE_CRAFT) saveToHistory(newSections, header, footer);
    setAddSectionAfterIndex(null);
  };

  const deleteSection = (sIdx) => {
    const newSections = sections.filter((_, i) => i !== sIdx);
    setSections(newSections);
    if (!USE_CRAFT) saveToHistory(newSections, header, footer);
  };

  const duplicateSection = (sIdx) => {
    const sec = sections[sIdx];
    const newSec = JSON.parse(JSON.stringify(sec));
    delete newSec.id;
    const newSections = [...sections.slice(0, sIdx + 1), newSec, ...sections.slice(sIdx + 1)];
    setSections(newSections);
    if (!USE_CRAFT) saveToHistory(newSections, header, footer);
  };

  const updateSection = (sIdx, updates) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, ...updates } : s);
    setSections(newSections);
    if (!USE_CRAFT) saveToHistory(newSections, header, footer);
  };

  // —— Block-level operations (within a section) ———————————————————————————————

  const updateSectionBlocks = (sIdx, newBlocks) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
    setSections(newSections);
    if (!USE_CRAFT) saveToHistory(newSections, header, footer);
  };

  const addBlockToSection = (sIdx, type) => {
    const sec = sections[sIdx];
    const newBlock = { type, content: makeDefaultBlockContent(type) };
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
    updateSectionBlocks(sIdx, newBlocks);
  };

  const deleteBlock = (sIdx, bIdx) => {
    const sec = sections[sIdx];
    updateSectionBlocks(sIdx, (sec.blocks || []).filter((_, i) => i !== bIdx));
  };

  const moveBlock = (sIdx, fromIndex, toIndex) => {
    const sec = sections[sIdx];
    const newBlocks = [...(sec.blocks || [])];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    updateSectionBlocks(sIdx, newBlocks);
  };

  const duplicateBlock = (sIdx, bIdx) => {
    const sec = sections[sIdx];
    const block = sec.blocks[bIdx];
    const newBlock = { ...block, content: JSON.parse(JSON.stringify(block.content)) };
    delete newBlock.id;
    const newBlocks = [...sec.blocks.slice(0, bIdx + 1), newBlock, ...sec.blocks.slice(bIdx + 1)];
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const sIdx = parseInt(result.source.droppableId.replace('section-', ''), 10);
    moveBlock(sIdx, result.source.index, result.destination.index);
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

  return (
    <WebCraftRoot
      enabled={USE_CRAFT}
      sections={sections}
      historyApiRef={craftHistoryRef}
      onAddSectionBelow={(i) => setAddSectionAfterIndex(i)}
      onAddBlock={(sectionIndex) => setBlockPaletteTarget({ sectionIndex })}
      onDeleteSection={(i) => deleteSection(i)}
      onDuplicateSection={(i) => duplicateSection(i)}
      onCraftChange={(nextSections) => {
        setSections(nextSections);
        setLastChangeTime(Date.now());
      }}
    >
    <div className="min-h-screen bg-surface-raised">
      {/* Improved top toolbar */}
      <div className="bg-surface border-b border-border px-6 py-4 sticky top-0 z-40 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-dropdown">
                <LayoutGrid className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-base">Website Editor</h1>
                <p className="text-small text-muted">Page: {pageSlug}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <BuilderPreviewControls value={previewDevice} onChange={setPreviewDevice} />
            <BuilderHistoryControls onUndo={handleUndo} onRedo={handleRedo} canUndo={USE_CRAFT || historyIndex > 0} canRedo={USE_CRAFT || historyIndex < history.length - 1} />

            {/* Publish / Draft toggle */}
            <button
              onClick={async () => {
                if (!pageData?.id || publishSaving) return;
                setPublishSaving(true);
                try {
                  await api.patch(`/web/pages/${pageData.id}`, { isPublished: !isPublished });
                  setIsPublished(p => !p);
                } catch (e) {
                  console.error('Failed to toggle publish status:', e);
                } finally {
                  setPublishSaving(false);
                }
              }}
              disabled={publishSaving}
              className={`px-4 py-2.5 min-h-[44px] rounded-xl flex items-center gap-2 transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                isPublished
                  ? 'bg-success/10 text-success hover:bg-success/20'
                  : 'bg-surface-raised text-muted hover:bg-border'
              }`}
              title={isPublished ? 'Page is published — click to set to Draft' : 'Page is a draft — click to Publish'}
            >
              <div className={`w-2 h-2 rounded-full ${isPublished ? 'bg-success' : 'bg-muted'}`} />
              {publishSaving ? 'Updating...' : isPublished ? 'Published' : 'Draft'}
            </button>

            <div className="flex min-w-[120px] justify-center rounded-lg border border-border bg-surface-raised px-4 py-2 text-small font-medium">
              <BuilderSaveStatus status={saveStatus} />
            </div>

            {/* Actions - improved styling */}
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  const name = window.prompt('Name this reusable page template:', pageData?.title || pageSlug);
                  if (!name?.trim() || templateSaving) return;
                  setTemplateSaving(true);
                  try {
                    await api.post('/web/page-templates', { name: name.trim(), snapshot: { template: pageData?.template, header, footer, sections } });
                  } catch (error) {
                    console.error('Failed to save page template:', error);
                  } finally {
                    setTemplateSaving(false);
                  }
                }}
                disabled={templateSaving}
                className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-xl flex items-center gap-2 transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50"
                title="Save this page as a reusable template"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">{templateSaving ? 'Saving—' : 'Save template'}</span>
              </button>
              <button
                onClick={() => setShowVersionHistory(true)}
                className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-xl flex items-center gap-2 transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Version history"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-xl flex items-center gap-2 transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Keyboard shortcuts"
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">Shortcuts</span>
              </button>
              <button
                onClick={() => window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank')}
                className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-xl flex items-center gap-2 transition-colors duration-150 font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </button>
              <button
                onClick={() => saveRef.current()}
                disabled={saveStatus === 'saving'}
                className="px-5 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-150 font-medium shadow-dropdown focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {showVersionHistory && (
        <WebVersionHistoryPanel
          slug={pageSlug}
          onClose={() => setShowVersionHistory(false)}
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

      {/* Main editor area — sections */}
      <div className="flex">
        <div className="flex-1">
          <div className={`min-h-screen ${previewDevice === 'desktop' ? 'bg-surface' : 'bg-surface-raised py-8'}`}>
            <div className={`${deviceClasses[previewDevice]} bg-surface min-h-screen ${previewDevice !== 'desktop' ? 'rounded-xl overflow-hidden' : ''}`}>

              {USE_CRAFT ? (
                <>
                  {sections.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8">
                      <p className="text-muted">Canvas is empty — add a section to begin</p>
                      <button
                        type="button"
                        onClick={() => setAddSectionAfterIndex(-1)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
                      >
                        <Plus className="w-5 h-5" />
                        Add Section
                      </button>
                    </div>
                  )}
                  <CraftCanvas className="min-h-[60vh]" />
                </>
              ) : (
              <>


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

              {/* Sections list */}
              {sections.map((section, sIdx) => (
                <SectionWrapper
                  key={section.id || sIdx}
                  section={section}
                  sectionIndex={sIdx}
                  onAddSectionBelow={(i) => setAddSectionAfterIndex(i)}
                  onDeleteSection={deleteSection}
                  onDuplicateSection={duplicateSection}
                  onUpdateSection={updateSection}
                >
                  {/* Blocks inside section — multi-column grid if columns > 1 */}
                  {section.columns > 1 ? (
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                        gap: `${section.gap ?? 24}px`,
                      }}
                    >
                      {Array.from({ length: section.columns }).map((_, colIdx) => {
                        // Distribute blocks across columns in order
                        const colBlocks = (section.blocks || []).filter((_, bi) => bi % section.columns === colIdx);
                        const colBlockIndices = (section.blocks || []).reduce((acc, _, bi) => {
                          if (bi % section.columns === colIdx) acc.push(bi);
                          return acc;
                        }, []);
                        return (
                          <div key={colIdx} className="min-h-[60px]">
                            <DragDropContext onDragEnd={handleDragEnd}>
                              <Droppable droppableId={`section-${sIdx}`}>
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef}>
                                    {colBlocks.map((block, i) => {
                                      const bIdx = colBlockIndices[i];
                                      return (
                                        <Draggable key={bIdx} draggableId={`s${sIdx}-b${bIdx}`} index={bIdx}>
                                          {(provided, snapshot) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className="mb-2">
                                              <EditableBlock
                                                block={block}
                                                index={bIdx}
                                                onUpdate={(idx, updates) => updateBlock(sIdx, idx, updates)}
                                                onDelete={(idx) => deleteBlock(sIdx, idx)}
                                                onMoveUp={(idx) => idx > 0 && moveBlock(sIdx, idx, idx - 1)}
                                                onMoveDown={(idx) => idx < section.blocks.length - 1 && moveBlock(sIdx, idx, idx + 1)}
                                                onDuplicate={(idx) => duplicateBlock(sIdx, idx)}
                                                onUpdateContent={(updates) => updateBlockContent(sIdx, bIdx, updates)}
                                                saveRef={saveRef}
                                                isDragging={snapshot.isDragging}
                                              >
                                                <div {...provided.dragHandleProps} className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto p-2 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                                                  <GripVertical className="w-5 h-5 text-subtle" />
                                                </div>
                                                {renderEditableBlock(block, sIdx, bIdx)}
                                              </EditableBlock>
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </DragDropContext>
                            <AddBlockButton onClick={() => setBlockPaletteTarget({ sectionIndex: sIdx })} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single-column: blocks stacked vertically */
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId={`section-${sIdx}`}>
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef}>
                            {(section.blocks || []).map((block, bIdx) => (
                              <Draggable key={bIdx} draggableId={`s${sIdx}-b${bIdx}`} index={bIdx}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className="mb-2">
                                    <EditableBlock
                                      block={block}
                                      index={bIdx}
                                      onUpdate={(idx, updates) => updateBlock(sIdx, idx, updates)}
                                      onDelete={(idx) => deleteBlock(sIdx, idx)}
                                      onMoveUp={(idx) => idx > 0 && moveBlock(sIdx, idx, idx - 1)}
                                      onMoveDown={(idx) => idx < section.blocks.length - 1 && moveBlock(sIdx, idx, idx + 1)}
                                      onDuplicate={(idx) => duplicateBlock(sIdx, idx)}
                                      onUpdateContent={(updates) => updateBlockContent(sIdx, bIdx, updates)}
                                      saveRef={saveRef}
                                      isDragging={snapshot.isDragging}
                                    >
                                      <div {...provided.dragHandleProps} className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto p-2 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                                        <GripVertical className="w-5 h-5 text-subtle" />
                                      </div>
                                      {renderEditableBlock(block, sIdx, bIdx)}
                                    </EditableBlock>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}

                  {/* Add Block button — always visible inside section */}
                  {section.columns <= 1 && (
                    <div className="px-6 py-3">
                      <AddBlockButton onClick={() => setBlockPaletteTarget({ sectionIndex: sIdx })} />
                    </div>
                  )}
                </SectionWrapper>
              ))}

              {/* Bottom "Add Section" button — shown when page has sections */}
              {sections.length > 0 && (
                <div className="p-8 text-center border-t border-border bg-gradient-to-b from-surface to-surface-raised">
                  <button
                    onClick={() => setAddSectionAfterIndex(sections.length - 1)}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:from-primary-hover hover:to-primary-hover transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 font-semibold text-lg"
                  >
                    <Plus className="w-6 h-6" />
                    Add Section
                  </button>
                  <p className="mt-3 text-sm text-muted">
                    or press <kbd className="px-2 py-0.5 bg-surface-tertiary rounded text-xs font-mono">+</kbd> to add a section
                  </p>
                </div>
              )}

              </>
              )}

            </div>
          </div>
        </div>

        {/* Right-hand inspector panel — slider settings (shown when a slider block is selected) */}
        {USE_CRAFT && <SliderInspectorPanel />}
      </div>

      {/* Add Section modal */}
      {addSectionAfterIndex !== null && (
        <AddSectionModal
          onClose={() => setAddSectionAfterIndex(null)}
          onAdd={(sectionConfig) => addSection(sectionConfig, addSectionAfterIndex)}
        />
      )}

      {/* Block palette modal — for adding blocks inside a section */}
      {blockPaletteTarget !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] animate-in fade-in duration-200" onMouseDown={e => { if (e.target === e.currentTarget) setBlockPaletteTarget(null); }} onKeyDown={e => { if (e.key === 'Escape') setBlockPaletteTarget(null); }}>
          <div className="bg-surface rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="block-palette-title">
            <div className="p-6 border-b border-border bg-surface-raised">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 id="block-palette-title" className="text-xl font-semibold text-text-base">Add Block</h3>
                    <p className="text-sm text-muted">Choose a block type to add to this section</p>
                  </div>
                </div>
                <button
                  onClick={() => setBlockPaletteTarget(null)}
                  className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BLOCK_TYPES.map(({ id, name, Icon, description }) => (
                  <button
                    key={id}
                    onClick={() => addBlockToSection(blockPaletteTarget.sectionIndex, id)}
                    className="p-5 border-2 border-border rounded-xl hover:border-primary-light hover:bg-primary-light hover:shadow-lg transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-raised group-hover:bg-primary-light flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon className="w-6 h-6 text-muted group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-text-base mb-1 group-hover:text-primary transition-colors">{name}</div>
                        <div className="text-sm text-muted leading-relaxed">{description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved keyboard shortcuts help modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] animate-in fade-in duration-200" onMouseDown={e => { if (e.target === e.currentTarget) setShowKeyboardHelp(false); }} onKeyDown={e => { if (e.key === 'Escape') setShowKeyboardHelp(false); }}>
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="keyboard-help-title">
            <div className="p-6 border-b border-border bg-surface-raised">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-info-light flex items-center justify-center">
                    <Type className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <h3 id="keyboard-help-title" className="text-xl font-semibold text-text-base">Keyboard Shortcuts</h3>
                    <p className="text-sm text-muted">Speed up your editing workflow</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { action: 'Save', shortcut: 'Ctrl/Cmd + S' },
                    { action: 'Undo', shortcut: 'Ctrl/Cmd + Z' },
                    { action: 'Redo', shortcut: 'Ctrl/Cmd + Shift + Z' },
                    { action: 'Preview', shortcut: 'Ctrl/Cmd + P' },
                    { action: 'Add Section', shortcut: '+' },
                    { action: 'Close Dialog', shortcut: 'Esc' },
                    { action: 'Show Help', shortcut: '?' },
                  ].map(({ action, shortcut }) => (
                    <div key={action} className="flex justify-between items-center p-3 bg-surface-raised rounded-lg">
                      <span className="text-text-base font-medium">{action}</span>
                      <kbd className="px-3 py-1.5 bg-surface border border-border-strong rounded-lg text-sm font-mono shadow-sm">{shortcut}</kbd>
                    </div>
                  ))}
                </div>
                
                <div className="p-5 bg-gradient-to-br from-primary-light to-info-light rounded-xl border border-primary-light">
                  <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Pro Tips
                  </h4>
                  <ul className="text-sm text-primary space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>Click any text to edit it inline with auto-save</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>Hover over blocks to reveal action toolbar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>Drag blocks to reorder them on the page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>Use the style panel (palette icon) for advanced styling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">-</span>
                      <span>Switch device previews to see responsive layouts</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </WebCraftRoot>
  );
}
