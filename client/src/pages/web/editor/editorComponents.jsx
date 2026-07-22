import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, GripVertical, Image as ImageIcon, Eye,
  Palette, Type, Settings, Save, X, Check, AlertCircle, ChevronDown, ChevronUp,
  Link as LinkIcon, Edit3, Move, Copy, Upload,
  Columns,
  Bold, Italic, Rows3, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus, ExternalLink, HelpCircle
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../../utils/api';
import ColorPicker from '../../../components/ColorPicker';
import { AccessibleModal } from '../../../components/Dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import InlineTextEditor from './InlineTextEditor';
import { resolveUrl, BLOCK_TYPES, DEFAULT_SECTION, makeDefaultBlockContent, SECTION_LAYOUTS, SPACING_PRESETS } from './editorUtils';
const BaseEditableText = ({
  content,
  onChange,
  onEditingStart,
  onEditingEnd,
  placeholder = 'Click to edit',
  className = '',
  style = {},
  multiline = false,
  tag = 'span',
  minHeight,
}) => {
  // Delegate to the inline contentEditable + dark floating toolbar editor.
  // This preserves the existing prop signature so all 57 BlockContent call
  // sites get the inline editor without any changes. The old click-to-input
  // behavior is replaced by direct in-place editing with a mockup-style
  // floating toolbar (see text-editor-mocup.html).
  return (
    <InlineTextEditor
      content={content}
      onChange={onChange}
      onEditingStart={onEditingStart}
      onEditingEnd={onEditingEnd}
      placeholder={placeholder}
      className={className}
      style={style}
      multiline={multiline}
      tag={tag}
      minHeight={minHeight}
    />
  );
};

// ─── Markdown Content Block Editor ───────────────────────────────────────────
// Renders a rich markdown editor with formatting toolbar, live preview toggle,
// auto-resizing textarea, and word/character count.

const renderMarkdownPreview = (md) =>
  DOMPurify.sanitize(marked.parse(md || ''), {
    ALLOWED_TAGS: ['p','br','strong','em','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img'],
    ALLOWED_ATTR: ['href','title','target','rel','src','alt','class'],
  });

const MD_HELP = [
  { syntax: '**bold**',        desc: 'Bold' },
  { syntax: '*italic*',        desc: 'Italic' },
  { syntax: '# Heading 1',     desc: 'H1' },
  { syntax: '## Heading 2',    desc: 'H2' },
  { syntax: '### Heading 3',   desc: 'H3' },
  { syntax: '- item',          desc: 'Bullet list' },
  { syntax: '1. item',         desc: 'Numbered list' },
  { syntax: '> quote',         desc: 'Blockquote' },
  { syntax: '`code`',          desc: 'Inline code' },
  { syntax: '[text](url)',      desc: 'Link' },
  { syntax: '---',             desc: 'Divider' },
];

const MarkdownContentEditor = ({ value, onChange }) => {
  const [showPreview, setShowPreview]   = useState(false);
  const [showHelp,    setShowHelp]      = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea to content height
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(220, el.scrollHeight)}px`;
  };

  useEffect(() => { autoResize(); }, [value, showPreview]);

  // Insert markdown syntax at cursor position
  const insert = (before, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = el.value.slice(start, end) || placeholder;
    const next  = el.value.slice(0, start) + before + sel + after + el.value.slice(end);
    onChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + sel.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = value ? value.length : 0;

  const toolbarBtns = [
    { title: 'Bold',        Icon: Bold,         action: () => insert('**', '**', 'bold text') },
    { title: 'Italic',      Icon: Italic,        action: () => insert('*', '*', 'italic text') },
    { title: 'H1',          Icon: Heading1,      action: () => insert('# ', '', 'Heading 1') },
    { title: 'H2',          Icon: Heading2,      action: () => insert('## ', '', 'Heading 2') },
    { title: 'H3',          Icon: Heading3,      action: () => insert('### ', '', 'Heading 3') },
    null, // separator
    { title: 'Bullet list', Icon: List,          action: () => insert('- ', '', 'List item') },
    { title: 'Numbered list', Icon: ListOrdered, action: () => insert('1. ', '', 'List item') },
    { title: 'Blockquote',  Icon: Quote,         action: () => insert('> ', '', 'Quote') },
    { title: 'Inline code', Icon: Code,          action: () => insert('`', '`', 'code') },
    { title: 'Link',        Icon: ExternalLink,  action: () => insert('[', '](https://)', 'link text') },
    { title: 'Divider',     Icon: Minus,         action: () => insert('\n---\n') },
  ];

  return (
    <div className="flex flex-col gap-0 border border-border rounded-lg overflow-hidden shadow-sm">
      {/* Toolbar row */}
      <div role="toolbar" aria-label="Markdown formatting" className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-raised border-b border-border flex-wrap">
        {toolbarBtns.map((btn, i) =>
          btn === null ? (
            <div key={`sep-${i}`} className="w-px h-5 bg-border mx-1" />
          ) : (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onClick={btn.action}
              className="p-1.5 rounded hover:bg-surface text-muted hover:text-base transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            >
              <btn.Icon className="w-4 h-4" />
            </button>
          )
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Help toggle */}
        <button
          type="button"
          title="Markdown help"
          onClick={() => setShowHelp(h => !h)}
          className={`p-1.5 rounded transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showHelp ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-surface hover:text-base'}`}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Preview toggle */}
        <button
          type="button"
          title={showPreview ? 'Back to editor' : 'Preview'}
          onClick={() => setShowPreview(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-small font-medium transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showPreview ? 'bg-primary text-primary-foreground' : 'text-muted hover:bg-surface hover:text-base'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="bg-surface-raised border-b border-border px-3 py-2">
          <p className="text-small font-semibold text-muted mb-1.5">Markdown quick reference</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {MD_HELP.map(({ syntax, desc }) => (
              <div key={syntax} className="flex items-center gap-2 text-small">
                <code className="font-mono text-primary bg-primary-light/50 px-1 rounded text-xs">{syntax}</code>
                <span className="text-subtle">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor / Preview area */}
      {showPreview ? (
        <div
          className="prose prose-sm max-w-none px-4 py-3 min-h-[220px] bg-surface prose-headings:font-bold prose-p:mb-3 prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(value) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); autoResize(); }}
          placeholder="Start typing your content here… Markdown is supported."
          className="w-full px-4 py-3 bg-surface text-base text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset min-h-[220px] font-mono"
          style={{ height: 'auto' }}
          rows={10}
        />
      )}

      {/* Footer: word/char count */}
      <div className="flex items-center justify-end gap-3 px-3 py-1 bg-surface-raised border-t border-border">
        <span className="text-xs text-subtle">{wordCount} words</span>
        <span className="text-xs text-subtle">{charCount} chars</span>
      </div>
    </div>
  );
};

// Dedicated hero block editor — formatting is handled inline by the
// FloatingToolbar that appears when text is selected in an EditableText field.
const HeroBlock = ({ block, index, updateBlockContent, updateBlock, EditableText }) => {
  const titleColor = block.style?.color || (block.content.backgroundImage ? 'hsl(var(--text-inverse))' : 'hsl(var(--text-base))');
  const subtitleColor = block.style?.color || (block.content.backgroundImage ? 'hsl(var(--text-muted))' : 'hsl(var(--text-muted))');

  // Base styles from block.style (color, background). Per-field font family /
  // size / weight / alignment are now applied inline via the FloatingToolbar
  // and stored in the HTML content, not in block.style.
  const titleStyle = {
    color: titleColor,
    fontFamily: block.style?.titleFontFamily || undefined,
    fontSize: block.style?.titleFontSize ? `${block.style.titleFontSize}px` : undefined,
    textAlign: block.style?.titleTextAlign || 'left',
    fontWeight: block.style?.titleFontWeight || 'normal',
    fontStyle: block.style?.titleFontStyle || 'normal',
  };
  const subtitleStyle = {
    color: subtitleColor,
    fontFamily: block.style?.subtitleFontFamily || undefined,
    fontSize: block.style?.subtitleFontSize ? `${block.style.subtitleFontSize}px` : undefined,
    textAlign: block.style?.subtitleTextAlign || 'left',
    fontWeight: block.style?.subtitleFontWeight || 'normal',
    fontStyle: block.style?.subtitleFontStyle || 'normal',
  };

  return (
    <div
      className={`text-center py-20 px-6 relative bg-cover bg-center bg-no-repeat ${block.content.backgroundImage ? 'min-h-[400px] flex flex-col justify-center' : ''}`}
      style={{
        backgroundImage: block.content.backgroundImage ? `url(${resolveUrl(block.content.backgroundImage)})` : undefined,
        backgroundColor: block.style?.backgroundColor || undefined,
      }}
    >
      {block.content.backgroundImage && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}

      <div className="relative z-10">
        <EditableText
          content={block.content.title}
          onChange={(value) => updateBlockContent(index, { title: value })}
          placeholder="Hero Title"
          className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 block"
          style={titleStyle}
          tag="h1"
        />
        <EditableText
          content={block.content.subtitle}
          onChange={(value) => updateBlockContent(index, { subtitle: value })}
          placeholder="Hero Subtitle"
          className="text-xl max-w-2xl mx-auto block"
          style={subtitleStyle}
          tag="div"
          multiline
        />
      </div>
    </div>
  );
};

// Editable image component
const BaseEditableImage = ({ 
  src, 
  alt, 
  onChange, 
  onRemove,
  onEditingStart,
  onEditingEnd,
  className = '',
  placeholder = 'Click to add image'
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [tempUrl, setTempUrl] = useState(src || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEditingStart?.();
    if (src) {
      setShowControls(!showControls);
    } else {
      setShowUrlDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setShowUrlDialog(false);
    setShowControls(false);
    onEditingEnd?.();
  };

  const handleUrlSave = async () => {
    setIsSaving(true);
    try {
      await onChange(tempUrl);
      setShowUrlDialog(false);
      setShowControls(false);
    } catch (error) {
      console.error('Failed to save image:', error);
    } finally {
      setIsSaving(false);
      onEditingEnd?.();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just create a local URL
      // In production, you'd upload to a service and get the URL back
      const url = URL.createObjectURL(file);
      setTempUrl(url);
      setShowUrlDialog(true);
    }
  };

  return (
    <div className="relative group">
      {/* Image or placeholder */}
      {src ? (
        <img 
          src={src} 
          alt={alt || ''}
          className={`${className} cursor-pointer hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-base`}
          onClick={handleImageClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleImageClick(e);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Edit image${alt ? `: ${alt}` : ''}`}
        />
      ) : (
        <div 
          className={`${className} border-2 border-dashed border-border rounded-base flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1`}
          onClick={handleImageClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleImageClick(e);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Add image: ${placeholder}`}
        >
          <ImageIcon className="w-12 h-12 text-subtle mb-2" />
          <span className="text-muted text-small">{placeholder}</span>
        </div>
      )}

      {/* Hover controls */}
      {src && showControls && (
        <div className="absolute inset-0 bg-black/50 rounded-base flex items-center justify-center gap-2">
          <button
            onClick={() => setShowUrlDialog(true)}
            className="px-3 py-2 min-h-[44px] bg-surface text-base rounded-base hover:bg-surface-raised flex items-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            <Edit3 className="w-4 h-4" />
            Replace
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 min-h-[44px] bg-surface text-base rounded-base hover:bg-surface-raised flex items-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            <ImageIcon className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={onRemove}
            className="px-3 py-2 min-h-[44px] bg-danger text-primary-foreground rounded-base hover:bg-danger-hover flex items-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}

      {/* URL dialog */}
      {showUrlDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]" onMouseDown={e => { if (e.target === e.currentTarget) setShowUrlDialog(false); }} onKeyDown={e => { if (e.key === 'Escape') setShowUrlDialog(false); }}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-[fadeInScale_0.15s_ease-out]" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="url-dialog-title">
            <h3 id="url-dialog-title" className="text-heading font-semibold mb-4">Edit Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">Image URL</label>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border-strong rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-3 py-2.5 min-h-[44px] bg-surface-raised text-muted rounded-base hover:bg-surface flex items-center justify-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload File
                </button>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowUrlDialog(false);
                    setTempUrl(src || '');
                    onEditingEnd?.();
                  }}
                  className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlSave}
                  disabled={!tempUrl.trim() || isSaving}
                  className="px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-base hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <AlertCircle className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

// Editable button component
const BaseEditableButton = ({ 
  text, 
  href, 
  onChange, 
  onRemove,
  onEditingStart,
  onEditingEnd,
  className = '',
  placeholder = 'Button Text'
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [tempText, setTempText] = useState(text || placeholder);
  const [tempHref, setTempHref] = useState(href || '#');
  const [isSaving, setIsSaving] = useState(false);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEditingStart?.();
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onChange({ text: tempText, href: tempHref });
      setShowEditDialog(false);
    } catch (error) {
      console.error('Failed to save button:', error);
    } finally {
      setIsSaving(false);
      onEditingEnd?.();
    }
  };

  return (
    <div className="relative inline-block group">
      <button
        className={`${className} hover:opacity-90 transition-opacity duration-150 relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-base`}
        onClick={handleButtonClick}
      >
        {text || placeholder}
        <Edit3 className="w-3 h-3 absolute -top-2 -right-2 opacity-0 group-hover:opacity-50 text-primary" />
      </button>

      {/* Edit dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]" onMouseDown={e => { if (e.target === e.currentTarget) setShowEditDialog(false); }} onKeyDown={e => { if (e.key === 'Escape') setShowEditDialog(false); }}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-[fadeInScale_0.15s_ease-out]" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
            <h3 id="edit-dialog-title" className="text-heading font-semibold mb-4">Edit Button</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">Button Text</label>
                <input
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border-strong rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  placeholder={placeholder}
                />
              </div>
              <div>
                <label className="block text-label text-muted mb-2">Link URL</label>
                <input
                  type="url"
                  value={tempHref}
                  onChange={(e) => setTempHref(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border-strong rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    onEditingEnd?.();
                  }}
                  className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!tempText.trim() || isSaving}
                  className="px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-base hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <AlertCircle className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Block wrapper for hover effects and actions
// Background Image Dialog Component
const BackgroundImageDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentUrl = '',
}) => {
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(currentUrl);
      setUploadError('');
    }
  }, [isOpen, currentUrl]);

  const handleSave = async () => {
    if (!url.trim()) return;
    await onSave(url.trim());
    onClose();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/web/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUrl(res.data.url);
    } catch (err) {
      setUploadError('Upload failed. Please try a URL instead.');
      console.error('Asset upload error:', err);
    } finally {
      setUploading(false);
      // Reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-[fadeInScale_0.15s_ease-out]" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="bg-image-title">
        <div className="flex items-center justify-between mb-4">
          <h3 id="bg-image-title" className="text-heading font-semibold">Background Image</h3>
          <button onClick={onClose} className="p-3 min-w-[44px] min-h-[44px] hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-3 min-h-[48px] border-2 border-dashed border-border rounded-base text-muted hover:border-primary hover:bg-primary-light flex items-center justify-center gap-2 disabled:opacity-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <AlertCircle className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload from computer
                </>
              )}
            </button>
            {uploadError && <p className="text-danger text-small mt-1">{uploadError}</p>}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-small">
              <span className="px-2 bg-surface text-muted">OR paste a URL</span>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUploadError(''); }}
              className="w-full px-3 py-2 border border-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {url && (
            <div>
              <label className="block text-label text-muted mb-2">Preview</label>
              <img 
                src={url} 
                alt="Preview" 
                className="w-full h-32 object-cover rounded-base border border-border"
                onError={(e) => { e.target.style.display = 'none'; }}
                onLoad={(e) => { e.target.style.display = ''; }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-muted hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || uploading}
            className="px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground rounded-base hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <AlertCircle className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditableBlock = ({ 
  block, 
  index, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  onDuplicate,
  onUpdateContent,   // pre-bound: (contentUpdates) => void
  saveRef,
  isDragging,
  children 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showBackgroundImageDialog, setShowBackgroundImageDialog] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const blockRef = useRef(null);

  const showActions = isHovered || isSelected;

  // Deselect when clicking outside this block
  useEffect(() => {
    if (!isSelected) return;
    const handleOutsideClick = (e) => {
      if (blockRef.current && !blockRef.current.contains(e.target)) {
        setIsSelected(false);
        setShowStylePanel(false);
        setShowQuickActions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSelected]);

  const handleUpdate = (field, value) => {
    onUpdate(index, { [field]: value });
  };

  const handleStyleUpdate = (styleUpdates) => {
    const currentStyle = block.style || {};
    const updatedStyle = { ...currentStyle, ...styleUpdates };
    onUpdate(index, { style: updatedStyle });
  };

  const handleBlockClick = (e) => {
    // Don't select if clicking on action buttons
    if (e.target.closest('.block-actions')) return;
    setIsSelected(true);
  };

  return (
    <div
      ref={blockRef}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleBlockClick}
    >

      {/* Inner block — block.style applied here so the outer wrapper always contains the toolbar */}
      <div className="relative" style={block.style || {}}>

      {/* Subtle hover outline - less intrusive */}
      <div className={`absolute inset-0 border-2 border-dashed border-primary rounded-base pointer-events-none transition-opacity duration-150 ${showActions ? 'opacity-100' : 'opacity-0'} ${isDragging ? 'border-primary border-solid' : ''}`} />
      
      {/* Improved block actions toolbar - cleaner design */}
      <div
        className={`absolute -top-14 left-0 flex items-center gap-1 bg-surface/95 backdrop-blur-sm border border-border rounded-lg shadow-dropdown p-1.5 z-50 transition-all duration-150 ${showActions ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
          {/* Primary actions - always visible */}
          <div className="flex items-center gap-1 pr-2 border-r border-border">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={`p-2 min-h-[44px] rounded-base hover:bg-surface-raised transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showQuickActions ? 'bg-primary-light text-primary' : 'text-muted'}`}
              title="Quick actions"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowStylePanel(!showStylePanel)}
              className={`p-2 min-h-[44px] rounded-base hover:bg-surface-raised transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showStylePanel ? 'bg-primary-light text-primary' : 'text-muted'}`}
              title="Style panel"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>

          {/* Quick actions dropdown */}
          {showQuickActions && (
            <div className="flex items-center gap-1 animate-in slide-in-from-top-1">
              <button
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                className="p-2 min-h-[44px] rounded-base hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={false}
                className="p-2 min-h-[44px] rounded-base hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={() => onDuplicate(index)}
                className="p-2 min-h-[44px] rounded-base hover:bg-surface-raised text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(index)}
                className="p-2 min-h-[44px] rounded-base hover:bg-danger-light text-danger transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Block type indicator */}
          <div className="ml-2 px-2 py-1 bg-surface-raised rounded text-small font-medium text-muted capitalize">
            {block.type}
          </div>
        </div>

      {/* Improved style panel - slide-in from right side */}
      {showStylePanel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998] transition-opacity"
            onClick={() => setShowStylePanel(false)}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-surface shadow-2xl z-[9999] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-base bg-primary-light flex items-center justify-center">
                  <Palette className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Style Panel</h4>
                  <p className="text-small text-muted capitalize">{block.type} block</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStylePanel(false)} 
                className="p-2 min-h-[44px] hover:bg-surface rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Background Section */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Background</h5>
                
                {/* Background Image - Only for hero blocks */}
                {block.type === 'hero' && (
                  <div className="bg-surface-raised rounded-lg p-4">
                    <label className="block text-label text-muted mb-2">Background Image</label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={block.content.backgroundImage || ''} 
                          onChange={(e) => onUpdateContent({ backgroundImage: e.target.value })} 
                          className="flex-1 px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                          placeholder="Enter image URL..." 
                        />
                        <button
                          onClick={() => setShowBackgroundImageDialog(true)}
                          className="px-4 py-2.5 min-h-[44px] text-small bg-primary text-primary-foreground rounded-base hover:bg-primary-hover flex items-center gap-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Browse
                        </button>
                      </div>
                      {block.content.backgroundImage && (
                        <div className="relative">
                          <img 
                            src={resolveUrl(block.content.backgroundImage)} 
                            alt="Background preview" 
                            className="w-full h-24 object-cover rounded-base border border-border"
                          />
                          <button
                            onClick={() => onUpdateContent({ backgroundImage: null })}
                            className="absolute top-2 right-2 p-1.5 bg-surface/90 backdrop-blur-sm rounded-base shadow-card hover:bg-danger-light text-danger transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
                            title="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Background Color */}
                <div className="bg-surface-raised rounded-base p-4">
                  <label className="block text-label text-muted mb-2">Background Color</label>
                  <div className="flex gap-3 items-center">
                    <ColorPicker
                      value={block.style?.backgroundColor || '#ffffff'}
                      onChange={(v) => handleStyleUpdate({ backgroundColor: v })}
                      label="Background Color"
                    />
                    <input 
                      type="text" 
                      value={block.style?.backgroundColor || '#ffffff'} 
                      onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })} 
                      className="flex-1 px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono" 
                      placeholder="#ffffff" 
                    />
                  </div>
                </div>
              </div>

              {/* Typography Section */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Typography</h5>
                
                {/* Text Color */}
                <div className="bg-surface-raised rounded-base p-4">
                  <label className="block text-label text-muted mb-2">Text Color</label>
                  <div className="flex gap-3 items-center">
                    <ColorPicker
                      value={block.style?.color || '#000000'}
                      onChange={(v) => handleStyleUpdate({ color: v })}
                      label="Text Color"
                    />
                    <input 
                      type="text" 
                      value={block.style?.color || '#000000'} 
                      onChange={(e) => handleStyleUpdate({ color: e.target.value })} 
                      className="flex-1 px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono" 
                      placeholder="#000000" 
                    />
                  </div>
                </div>
              </div>

              {/* Spacing Section */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Spacing</h5>
                
                {/* Padding */}
                <div className="bg-surface-raised rounded-base p-4">
                  <label className="block text-label text-muted mb-3">Padding (px)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-small text-subtle mb-1 block">Top</span>
                      <input 
                        type="number" 
                        value={block.style?.paddingTop ?? block.style?.padding ?? 40} 
                        onChange={(e) => handleStyleUpdate({ paddingTop: parseInt(e.target.value) || 0 })} 
                        className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                      />
                    </div>
                    <div>
                      <span className="text-small text-subtle mb-1 block">Bottom</span>
                      <input 
                        type="number" 
                        value={block.style?.paddingBottom ?? block.style?.padding ?? 40} 
                        onChange={(e) => handleStyleUpdate({ paddingBottom: parseInt(e.target.value) || 0 })} 
                        className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                      />
                    </div>
                  </div>
                </div>

                {/* Margin */}
                <div className="bg-surface-raised rounded-base p-4">
                  <label className="block text-label text-muted mb-3">Margin (px)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-small text-subtle mb-1 block">Top</span>
                        <input 
                          type="number" 
                          value={block.style?.marginTop ?? block.style?.margin ?? 0} 
                          onChange={(e) => handleStyleUpdate({ marginTop: parseInt(e.target.value) || 0 })} 
                          className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                        />
                      </div>
                      <div>
                        <span className="text-small text-subtle mb-1 block">Bottom</span>
                        <input 
                          type="number" 
                          value={block.style?.marginBottom ?? block.style?.margin ?? 0} 
                          onChange={(e) => handleStyleUpdate({ marginBottom: parseInt(e.target.value) || 0 })} 
                          className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Border Section */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Border</h5>
                <div className="bg-surface-raised rounded-base p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-small text-subtle mb-1 block">Width (px)</span>
                      <input 
                        type="number" 
                        value={block.style?.borderWidth || 0} 
                        onChange={(e) => { 
                          const w = parseInt(e.target.value) || 0; 
                          handleStyleUpdate({ 
                            borderWidth: w, 
                            borderStyle: w > 0 ? 'solid' : 'none', 
                            borderColor: block.style?.borderColor || 'hsl(var(--border))' 
                          }); 
                        }} 
                        className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                      />
                    </div>
                    <div>
                      <span className="text-small text-subtle mb-1 block">Color</span>
                      <ColorPicker
                        value={block.style?.borderColor || '#e5e7eb'}
                        onChange={(v) => handleStyleUpdate({ borderColor: v })}
                        label="Border Color"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="text-small text-subtle mb-1 block">Radius</span>
                      <select 
                        value={block.style?.borderRadius || 0} 
                        onChange={(e) => handleStyleUpdate({ borderRadius: parseInt(e.target.value) })} 
                        className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-surface"
                      >
                        <option value="0">Square</option>
                        <option value="4">Rounded</option>
                        <option value="8">More</option>
                        <option value="999">Full</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Text Alignment</h5>
                <div className="bg-surface-raised rounded-base p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {['left', 'center', 'right', 'justify'].map(align => (
                      <button 
                        key={align} 
                        onClick={() => handleStyleUpdate({ textAlign: align })} 
                        className={`px-3 py-2.5 min-h-[44px] text-small border rounded-base capitalize transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                          block.style?.textAlign === align 
                            ? 'bg-primary-light border-primary text-primary font-medium' 
                            : 'border-border hover:bg-surface text-muted'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Classes */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Advanced</h5>
                <div className="bg-surface-raised rounded-base p-4">
                  <label className="block text-label text-muted mb-2">Custom CSS Classes</label>
                  <input 
                    type="text" 
                    value={block.style?.customClasses || ''} 
                    onChange={(e) => handleStyleUpdate({ customClasses: e.target.value })} 
                    className="w-full px-3 py-2.5 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1 font-mono" 
                    placeholder="e.g. my-custom-class another-class" 
                  />
                  <p className="text-small text-subtle mt-2">Space-separated CSS class names to apply to this block</p>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface-raised">
              <button 
                onClick={() => handleStyleUpdate({})} 
                className="w-full px-4 py-2.5 min-h-[44px] bg-surface border border-border text-muted rounded-base hover:bg-surface-raised text-small font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                Reset to Default Styles
              </button>
            </div>
          </div>
        </>
      )}

      {/* Block settings (gear) — fixed centered modal */}
      {showBlockMenu && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowBlockMenu(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowBlockMenu(false); }}
        >
          <div className="bg-surface rounded-2xl shadow-2xl w-80 mx-4 animate-[fadeInScale_0.15s_ease-out]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="block-menu-title">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h4 className="font-semibold text-base capitalize">{block.type} Block Settings</h4>
              <button onClick={() => setShowBlockMenu(false)} className="p-2 min-h-[44px] hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Block ID (read-only) */}
              <div>
                <label className="block text-label text-muted mb-2">Block ID</label>
                <input type="text" readOnly value={block.id || '—'} className="w-full px-2 py-2 text-small border border-border rounded bg-surface-raised text-subtle select-all" />
              </div>

              {/* Block Type */}
              <div>
                <label className="block text-label text-muted mb-2">Block Type</label>
                <input type="text" readOnly value={block.type} className="w-full px-2 py-2 text-small border border-border rounded bg-surface-raised text-subtle capitalize" />
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between">
                <label className="text-label text-muted">Visible</label>
                <button
                  onClick={() => handleUpdate('hidden', !block.hidden)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-150 ${block.hidden ? 'bg-border' : 'bg-primary'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${block.hidden ? 'left-1' : 'left-5'}`} />
                </button>
              </div>

              {/* Anchor / ID for linking */}
              <div>
                <label className="block text-label text-muted mb-2">Anchor (for #links)</label>
                <input
                  type="text"
                  value={block.anchor || ''}
                  onChange={(e) => handleUpdate('anchor', e.target.value)}
                  className="w-full px-2 py-2 text-small border border-border-strong rounded-base focus:ring-2 focus:ring-primary focus:ring-offset-1"
                  placeholder="e.g. about-section"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex justify-end">
              <button onClick={() => setShowBlockMenu(false)} className="px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground text-small rounded-base hover:bg-primary-hover transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Image Dialog */}
      <BackgroundImageDialog
        isOpen={showBackgroundImageDialog}
        onClose={() => setShowBackgroundImageDialog(false)}
        onSave={(url) => {
          onUpdateContent({ backgroundImage: url });
          // Trigger an immediate save to persist to database
          setTimeout(() => saveRef.current?.(), 200);
        }}
        currentUrl={block.content.backgroundImage || ''}
      />

      {/* Block content */}
      <div className="relative">
        {children}
      </div>

      </div>{/* end inner block div */}

      {/* Block-level actions are now handled at section level */}
    </div>
  );
};


const StructuredBlockEditor = ({ block, onChange }) => {
  const content = block.content || {};
  const update = (changes) => onChange({ ...content, ...changes });
  const input = (key, label, placeholder = '') => (
    <label className="block text-xs text-muted">{label}
      <input value={content[key] || ''} onChange={e => update({ [key]: e.target.value })} placeholder={placeholder} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" />
    </label>
  );
  const arrayRows = (key, fields, emptyRow) => (
    <div className="space-y-2">
      {(content[key] || []).map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          {fields.map(field => <input key={field.key} value={row[field.key] || ''} onChange={e => { const rows = [...(content[key] || [])]; rows[index] = { ...rows[index], [field.key]: e.target.value }; update({ [key]: rows }); }} placeholder={field.label} className="px-2 py-2 border border-border rounded bg-surface text-sm" />)}
          <button type="button" onClick={() => update({ [key]: (content[key] || []).filter((_, i) => i !== index) })} className="px-2 py-2 text-xs text-danger border border-danger rounded">Ã—</button>
        </div>
      ))}
      <button type="button" onClick={() => update({ [key]: [...(content[key] || []), { ...emptyRow }] })} className="px-3 py-2 text-xs border border-dashed border-border rounded text-muted hover:border-primary hover:text-primary">+ Add item</button>
    </div>
  );

  if (block.type === 'trust-bar') return <div className="p-5 space-y-4 bg-surface-raised border border-border rounded-lg"><h3 className="text-sm font-semibold">Trust bar items</h3>{arrayRows('items', [{ key: 'number', label: 'Number' }, { key: 'label', label: 'Label' }], { number: '01', label: 'New point' })}</div>;
  if (block.type === 'split-banner') return <div className="p-5 space-y-4 bg-surface-raised border border-border rounded-lg"><div className="grid md:grid-cols-2 gap-3">{input('eyebrow', 'Eyebrow')}{input('title', 'Title')}</div>{input('body', 'Body text')}<div className="grid md:grid-cols-3 gap-3">{input('buttonText', 'Button text')}{input('buttonLink', 'Button link')}<label className="block text-xs text-muted">Button style<select value={content.buttonVariant || 'gold'} onChange={e => update({ buttonVariant: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface"><option value="gold">Gold</option><option value="outline">Outline</option><option value="default">Navy</option></select></label></div><h3 className="text-sm font-semibold pt-2">Service times</h3>{arrayRows('times', [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }], { label: 'Sunday morning', value: '9:00 AM' })}</div>;
  if (block.type === 'events') return <div className="p-5 space-y-4 bg-surface-raised border border-border rounded-lg">{input('eyebrow', 'Eyebrow')}{input('title', 'Title')}<h3 className="text-sm font-semibold pt-2">Events</h3>{arrayRows('items', [{ key: 'date', label: 'Date' }, { key: 'title', label: 'Title' }], { date: 'AUG 18', title: 'New event' })}{(content.items || []).map((item, index) => <div key={`details-${index}`} className="grid md:grid-cols-2 gap-2"><input value={item.description || ''} onChange={e => { const items = [...content.items]; items[index] = { ...items[index], description: e.target.value }; update({ items }); }} placeholder="Description" className="px-2 py-2 border border-border rounded bg-surface text-sm" /><input value={item.time || ''} onChange={e => { const items = [...content.items]; items[index] = { ...items[index], time: e.target.value }; update({ items }); }} placeholder="Time" className="px-2 py-2 border border-border rounded bg-surface text-sm" /></div>)}</div>;
  if (block.type === 'quote') return <div className="p-5 space-y-4 bg-surface-raised border border-border rounded-lg">{input('quote', 'Quote')}{input('citation', 'Citation')}{input('backgroundColor', 'Background color', '#eadfc9')}</div>;
  return <div className="p-5 space-y-4 bg-surface-raised border border-border rounded-lg">{input('address', 'Address')}{input('embedUrl', 'Map embed URL (optional)')}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const AddSectionModal = ({ onClose, onAdd }) => {
  const [selectedLayout, setSelectedLayout] = useState(SECTION_LAYOUTS[0]);
  const [paddingPreset, setPaddingPreset] = useState('MD');
  const [paddingCustomTop, setPaddingCustomTop] = useState('');
  const [paddingCustomBottom, setPaddingCustomBottom] = useState('');
  const [marginTop, setMarginTop] = useState(0);
  const [marginBottom, setMarginBottom] = useState(0);
  const [bgColor, setBgColor] = useState('');

  const resolvedPaddingV = () => {
    if (paddingCustomTop !== '' || paddingCustomBottom !== '') return null;
    return SPACING_PRESETS.find(p => p.label === paddingPreset)?.value ?? 48;
  };

  const handleAdd = () => {
    const pv = resolvedPaddingV();
    onAdd({
      ...DEFAULT_SECTION,
      columns:         selectedLayout.columns,
      paddingTop:      paddingCustomTop    !== '' ? parseInt(paddingCustomTop, 10)    : (pv ?? 48),
      paddingBottom:   paddingCustomBottom !== '' ? parseInt(paddingCustomBottom, 10) : (pv ?? 48),
      paddingLeft:     0,
      paddingRight:    0,
      marginTop:       marginTop,
      marginBottom:    marginBottom,
      backgroundColor: bgColor || null,
      blocks:          [],
    });
  };

  return (
    <AccessibleModal onClose={onClose} labelledById="add-section-title" maxWidth="max-w-2xl" className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <Rows3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 id="add-section-title" className="text-xl font-semibold text-text-base">Add Section</h3>
              <p className="text-sm text-muted">Choose a layout for your new section</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Layout picker */}
          <div>
            <h4 className="text-sm font-semibold text-text-base mb-3 uppercase tracking-wide">Layout</h4>
            <div className="grid grid-cols-3 gap-3">
              {SECTION_LAYOUTS.map(layout => (
                <button
                  key={layout.columns}
                  onClick={() => setSelectedLayout(layout)}
                  className={`p-4 border-2 rounded-xl text-left transition-all duration-150 ${selectedLayout.columns === layout.columns ? 'border-primary bg-primary-light' : 'border-border hover:border-primary-light hover:bg-primary-light/50'}`}
                >
                  {/* Mini column preview */}
                  <div className="flex gap-1 mb-2 h-8">
                    {layout.preview.map((w, i) => (
                      <div key={i} className={`rounded h-full ${selectedLayout.columns === layout.columns ? 'bg-primary-light' : 'bg-surface-tertiary'}`} style={{ flex: w }} />
                    ))}
                  </div>
                  <div className={`text-sm font-medium ${selectedLayout.columns === layout.columns ? 'text-primary' : 'text-text-base'}`}>{layout.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Padding */}
          <div>
            <h4 className="text-sm font-semibold text-text-base mb-3 uppercase tracking-wide">Vertical Padding</h4>
            <div className="flex gap-2 mb-3">
              {SPACING_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPaddingPreset(p.label); setPaddingCustomTop(''); setPaddingCustomBottom(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${paddingPreset === p.label && paddingCustomTop === '' && paddingCustomBottom === '' ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted hover:bg-surface-tertiary'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Top (px)</label>
                <input type="number" value={paddingCustomTop} onChange={e => setPaddingCustomTop(e.target.value)} placeholder={String(SPACING_PRESETS.find(p => p.label === paddingPreset)?.value ?? 48)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Bottom (px)</label>
                <input type="number" value={paddingCustomBottom} onChange={e => setPaddingCustomBottom(e.target.value)} placeholder={String(SPACING_PRESETS.find(p => p.label === paddingPreset)?.value ?? 48)} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Margin */}
          <div>
            <h4 className="text-sm font-semibold text-text-base mb-3 uppercase tracking-wide">Vertical Margin</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Top (px)</label>
                <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Bottom (px)</label>
                <input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          </div>

          {/* Background color */}
          <div>
            <h4 className="text-sm font-semibold text-text-base mb-3 uppercase tracking-wide">Background Color</h4>
            <div className="flex items-center gap-3">
              <ColorPicker value={bgColor || '#ffffff'} onChange={setBgColor} label="Background Color" />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} placeholder="e.g. #f9fafb or transparent" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {bgColor && <button onClick={() => setBgColor('')} className="text-sm text-muted hover:text-text-base">Clear</button>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-border text-text-base rounded-xl hover:bg-surface-raised transition-colors font-medium">Cancel</button>
          <button onClick={handleAdd} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
    </AccessibleModal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionWrapper — hover UI for sections
// ─────────────────────────────────────────────────────────────────────────────

const SectionWrapper = ({ section, sectionIndex, onAddSectionBelow, onDeleteSection, onDuplicateSection, onUpdateSection, children, readOnly }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sectionStyle = {
    paddingTop:      section.paddingTop     ?? 48,
    paddingBottom:   section.paddingBottom  ?? 48,
    paddingLeft:     section.paddingLeft    ?? 0,
    paddingRight:    section.paddingRight   ?? 0,
    marginTop:       section.marginTop      ?? 0,
    marginBottom:    section.marginBottom   ?? 0,
    backgroundColor: section.backgroundColor || undefined,
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section hover outline */}
      {!readOnly && (
        <div className={`absolute inset-0 border-2 border-dashed pointer-events-none transition-opacity duration-150 z-10 ${isHovered ? 'border-primary-light opacity-100' : 'border-transparent opacity-0'}`} />
      )}

      {/* Section actions toolbar — top-left on hover */}
      {!readOnly && (
        <div className={`absolute top-2 left-2 z-20 flex items-center gap-1 bg-surface/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-1 transition-all duration-150 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <span className="px-2 text-xs font-medium text-muted border-r border-border mr-1">Section {sectionIndex + 1}</span>
        <button
          onClick={() => setShowSettings(s => !s)}
          title="Section settings"
          className="p-1.5 hover:bg-surface-raised rounded text-muted hover:text-text-base transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDuplicateSection(sectionIndex)}
          title="Duplicate section"
          className="p-1.5 hover:bg-surface-raised rounded text-muted hover:text-text-base transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDeleteSection(sectionIndex)}
          title="Delete section"
          className="p-1.5 hover:bg-danger-light rounded text-muted hover:text-danger transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      )}

      {/* Inline settings panel */}
      {showSettings && !readOnly && (
        <div className="absolute top-10 left-2 z-30 bg-surface border border-border rounded-xl shadow-xl p-4 w-72" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text-base">Section Settings</h4>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-surface-raised rounded"><X className="w-4 h-4 text-muted" /></button>
          </div>
          <div className="space-y-3">
            {/* Columns */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Columns</label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => onUpdateSection(sectionIndex, { columns: n })}
                    className={`flex-1 py-1 text-xs rounded ${section.columns === n ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted hover:bg-surface-tertiary'}`}>{n === 1 ? 'Full' : n}</button>
                ))}
              </div>
            </div>
            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-muted mb-1">Padding Top</label>
                <input type="number" value={section.paddingTop ?? 48} onChange={e => onUpdateSection(sectionIndex, { paddingTop: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Padding Bottom</label>
                <input type="number" value={section.paddingBottom ?? 48} onChange={e => onUpdateSection(sectionIndex, { paddingBottom: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Margin Top</label>
                <input type="number" value={section.marginTop ?? 0} onChange={e => onUpdateSection(sectionIndex, { marginTop: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Margin Bottom</label>
                <input type="number" value={section.marginBottom ?? 0} onChange={e => onUpdateSection(sectionIndex, { marginBottom: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            {/* Background color */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Background Color</label>
              <div className="flex items-center gap-2">
                <ColorPicker value={section.backgroundColor || '#ffffff'} onChange={(v) => onUpdateSection(sectionIndex, { backgroundColor: v })} label="Section Background Color" />
                <input type="text" value={section.backgroundColor || ''} onChange={e => onUpdateSection(sectionIndex, { backgroundColor: e.target.value || null })} placeholder="transparent" className="flex-1 px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section content */}
      <div style={sectionStyle}>
        {children}
      </div>

      {/* "Add Section" button — appears at the bottom of this section on hover */}
      {!readOnly && (
      <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-150 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => onAddSectionBelow(sectionIndex)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow-lg hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AddBlockButton — small "+" button inside a section column
// ─────────────────────────────────────────────────────────────────────────────

const AddBlockButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-subtle hover:border-primary-light hover:text-primary hover:bg-primary-light transition-all duration-150 text-sm font-medium group"
  >
    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
    Add Block
  </button>
);
export {
  BaseEditableText,
  renderMarkdownPreview,
  MarkdownContentEditor,
  HeroBlock,
  BaseEditableImage,
  BaseEditableButton,
  BackgroundImageDialog,
  EditableBlock,
  StructuredBlockEditor,
  AddSectionModal,
  SectionWrapper,
  AddBlockButton,
};
