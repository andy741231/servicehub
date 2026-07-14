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
import api from '../../utils/api';
import ColorPicker from '../../components/ColorPicker';
import BuilderHistoryControls from '../../components/builder/BuilderHistoryControls';
import BuilderPreviewControls from '../../components/builder/BuilderPreviewControls';
import BuilderSaveStatus from '../../components/builder/BuilderSaveStatus';
import RichTextEditor from '../../components/RichTextEditor';
import WebVersionHistoryPanel from './WebVersionHistoryPanel';

const resolveUrl = (url) => {
  if (!url) return '';
  // Convert same-origin absolute URLs to relative paths
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === window.location.hostname) return parsed.pathname + parsed.search + parsed.hash;
    } catch (e) { /* fall through */ }
    return url;
  }
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
};

const BLOCK_TYPES = [
  { id: 'slider',       name: 'Slider',       Icon: ImageIcon,     description: 'Slides with images, color, text, and video backgrounds' },
  { id: 'text',         name: 'Text',         Icon: AlignLeft,    description: 'Rich text content with formatting' },
  { id: 'trust-bar',     name: 'Trust Bar',   Icon: Star,          description: 'Numbered proof points and highlights' },
  { id: 'split-banner',  name: 'Split Banner',Icon: Hand,          description: 'Two-column callout with service times' },
  { id: 'events',        name: 'Events',      Icon: Rows3,         description: 'Upcoming events list' },
  { id: 'quote',         name: 'Quote',       Icon: Quote,          description: 'Large testimonial quote' },
  { id: 'map',           name: 'Map',         Icon: LayoutGrid,     description: 'Location and map placeholder' },
  { id: 'intro',        name: 'Introduction', Icon: Hand,         description: 'Introduction section with button' },
  { id: 'features',     name: 'Features',     Icon: Star,         description: 'Feature grid with icons' },
  { id: 'highlights',   name: 'Highlights',   Icon: Sparkles,     description: 'Highlight cards with images' },
  { id: 'gallery',      name: 'Gallery',      Icon: LayoutGrid,   description: 'Image gallery' },
  { id: 'testimonials', name: 'Testimonials', Icon: MessageSquare,description: 'Customer testimonials' },
  { id: 'contact',      name: 'Contact',      Icon: Mail,         description: 'Contact information' },
  { id: 'video',        name: 'Video',        Icon: Video,        description: 'Video section' },
  { id: 'grid',         name: 'Grid',         Icon: Columns,      description: 'Multi-column layout' },
];

// Improved editable text component with better UX
const BaseEditableText = ({ 
  content, 
  onChange, 
  onEditingStart,
  onEditingEnd,
  placeholder = 'Click to edit',
  className = '',
  style = {},
  multiline = false,
  tag = 'span'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setValue(content || '');
  }, [content]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    onEditingStart?.();
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        // Select all text
        if (ref.current.select) {
          ref.current.select();
        } else if (ref.current.setSelectionRange) {
          ref.current.setSelectionRange(0, ref.current.value.length);
        }
      }
    }, 0);
  };

  const handleBlur = async (e) => {
    const next = e.relatedTarget;
    if (next?.closest('.field-toolbar')) {
      // Clicking a toolbar control should keep the input focused so the toolbar remains visible.
      ref.current?.focus();
      return;
    }
    setIsEditing(false);
    onEditingEnd?.(e);
    if (value !== content) {
      setIsSaving(true);
      try {
        await onChange(value);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch (error) {
        console.error('Failed to save:', error);
        setValue(content); // Revert on error
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setValue(content);
      setIsEditing(false);
      onEditingEnd?.();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const Tag = tag;

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <div className="relative">
        <InputComponent
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${className} border-2 border-primary rounded-base px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-surface shadow-card transition-all duration-150`}
          style={style}
          placeholder={placeholder}
          {...(multiline ? { rows: 3 } : {})}
        />
        {isSaving && (
          <div className="absolute -top-10 right-0 bg-primary-light text-primary text-small font-medium px-3 py-1.5 rounded-base shadow-card flex items-center gap-1.5 animate-in slide-in-from-top-1">
            <AlertCircle className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
        {showSaved && (
          <div className="absolute -top-10 right-0 bg-success-light text-success text-small font-medium px-3 py-1.5 rounded-base shadow-card flex items-center gap-1.5 animate-in slide-in-from-top-1">
            <Check className="w-3 h-3" />
            Saved
          </div>
        )}
      </div>
    );
  }

  return (
    <Tag 
      className={`${className} cursor-text relative group transition-all duration-150 ${
        isHovered ? 'bg-primary-light/50 rounded-base px-2 -mx-2' : ''
      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-base`}
      style={style}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      aria-label={`Edit ${placeholder.toLowerCase()}`}
    >
      {content || (
        <span className="opacity-40 italic text-subtle">
          {placeholder}
        </span>
      )}
      {/* Improved edit indicator */}
      <div className={`absolute -top-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-base shadow-dropdown transition-all duration-150 ${
        isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <Edit3 className="w-3 h-3" />
      </div>
    </Tag>
  );
};

// Improved inline formatting toolbar with better design
const TextToolbar = ({ format = {}, onChange, onDelete, position = 'top' }) => {
  const {
    fontFamily = '',
    fontSize = '',
    textAlign = 'left',
    fontWeight = 'normal',
    fontStyle = 'normal',
  } = format;

  const update = (key, value) => onChange({ ...format, [key]: value });

  const alignOptions = [
    { id: 'left', Icon: AlignLeft },
    { id: 'center', Icon: AlignCenter },
    { id: 'right', Icon: AlignRight },
    { id: 'justify', Icon: AlignJustify },
  ];

  const toggleBold = () => update('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold');
  const toggleItalic = () => update('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic');

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 ${
        position === 'top' ? '-top-14' : 'bottom-full mb-2'
      } flex items-center gap-1.5 bg-surface/95 backdrop-blur-sm border border-border rounded-lg shadow-dropdown p-1.5 z-40 animate-in slide-in-from-top-1`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font family */}
      <select
        value={fontFamily}
        onChange={(e) => update('fontFamily', e.target.value)}
        title="Font family"
        className="h-9 px-2 text-small border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-surface hover:bg-surface-raised transition-colors duration-150"
      >
        <option value="">Default</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times New Roman</option>
        <option value="Courier New, monospace">Courier New</option>
        <option value="Verdana, sans-serif">Verdana</option>
      </select>

      {/* Font size */}
      <div className="relative">
        <input
          type="number"
          min={8}
          max={120}
          value={fontSize || ''}
          onChange={(e) => update('fontSize', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          placeholder="Size"
          title="Font size (px)"
          className="w-16 h-9 px-2 text-small border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 hover:bg-surface-raised transition-colors duration-150"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-small text-subtle pointer-events-none">px</span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Alignment */}
      <div className="flex items-center bg-surface-raised rounded-base p-0.5">
        {alignOptions.map(({ id, Icon }) => (
          <button
            key={id}
            onClick={() => update('textAlign', id)}
            className={`p-2 min-h-[44px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
              textAlign === id 
                ? 'bg-surface shadow-card text-primary' 
                : 'text-muted hover:bg-surface'
            }`}
            title={`Align ${id}`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Text style */}
      <div className="flex items-center bg-surface-raised rounded-base p-0.5">
        <button
          onClick={toggleBold}
          className={`p-2 min-h-[44px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
            fontWeight === 'bold' 
              ? 'bg-surface shadow-card text-primary' 
              : 'text-muted hover:bg-surface'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-2 min-h-[44px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
            fontStyle === 'italic' 
              ? 'bg-surface shadow-card text-primary' 
              : 'text-muted hover:bg-surface'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
      </div>

      {onDelete && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={onDelete}
            className="p-2 min-h-[44px] hover:bg-danger-light text-danger rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
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
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-raised border-b border-border flex-wrap">
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

// Dedicated hero block editor with per-field formatting toolbars
const HeroBlock = ({ block, index, updateBlockContent, updateBlock, EditableText }) => {
  const titleColor = block.style?.color || (block.content.backgroundImage ? 'hsl(var(--text-inverse))' : 'hsl(var(--text-base))');
  const subtitleColor = block.style?.color || (block.content.backgroundImage ? 'hsl(var(--text-muted))' : 'hsl(var(--text-muted))');

  const titleFormat = {
    fontFamily: block.style?.titleFontFamily || '',
    fontSize: block.style?.titleFontSize || '',
    textAlign: block.style?.titleTextAlign || 'left',
    fontWeight: block.style?.titleFontWeight || 'normal',
    fontStyle: block.style?.titleFontStyle || 'normal',
  };
  const subtitleFormat = {
    fontFamily: block.style?.subtitleFontFamily || '',
    fontSize: block.style?.subtitleFontSize || '',
    textAlign: block.style?.subtitleTextAlign || 'left',
    fontWeight: block.style?.subtitleFontWeight || 'normal',
    fontStyle: block.style?.subtitleFontStyle || 'normal',
  };

  const titleStyle = {
    color: titleColor,
    fontFamily: titleFormat.fontFamily || undefined,
    fontSize: titleFormat.fontSize ? `${titleFormat.fontSize}px` : undefined,
    textAlign: titleFormat.textAlign,
    fontWeight: titleFormat.fontWeight,
    fontStyle: titleFormat.fontStyle,
  };
  const subtitleStyle = {
    color: subtitleColor,
    fontFamily: subtitleFormat.fontFamily || undefined,
    fontSize: subtitleFormat.fontSize ? `${subtitleFormat.fontSize}px` : undefined,
    textAlign: subtitleFormat.textAlign,
    fontWeight: subtitleFormat.fontWeight,
    fontStyle: subtitleFormat.fontStyle,
  };

  const updateTitleFormat = (fmt) => updateBlock(index, {
    style: {
      ...block.style,
      titleFontFamily: fmt.fontFamily,
      titleFontSize: fmt.fontSize,
      titleTextAlign: fmt.textAlign,
      titleFontWeight: fmt.fontWeight,
      titleFontStyle: fmt.fontStyle,
    }
  });
  const updateSubtitleFormat = (fmt) => updateBlock(index, {
    style: {
      ...block.style,
      subtitleFontFamily: fmt.fontFamily,
      subtitleFontSize: fmt.fontSize,
      subtitleTextAlign: fmt.textAlign,
      subtitleFontWeight: fmt.fontWeight,
      subtitleFontStyle: fmt.fontStyle,
    }
  });

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
        <div className="relative inline-block w-full [&:focus-within_.field-toolbar]:block">
          <div className="field-toolbar hidden">
            <TextToolbar
              format={titleFormat}
              onChange={updateTitleFormat}
              onDelete={() => updateBlockContent(index, { title: '' })}
            />
          </div>
          <EditableText
            content={block.content.title}
            onChange={(value) => updateBlockContent(index, { title: value })}
            placeholder="Hero Title"
            className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 block"
            style={titleStyle}
            tag="h1"
          />
        </div>
        <div className="relative inline-block w-full [&:focus-within_.field-toolbar]:block">
          <div className="field-toolbar hidden">
            <TextToolbar
              format={subtitleFormat}
              onChange={updateSubtitleFormat}
              onDelete={() => updateBlockContent(index, { subtitle: '' })}
            />
          </div>
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

const SLIDER_DEFAULT_SLIDE = {
  id: '',
  backgroundType: 'color',
  backgroundColor: '#152b45',
  overlay: 'dark',
  textAlign: 'left',
  verticalAlign: 'center',
  eyebrow: '<p>New slide</p>',
  title: '<p>Slide title</p>',
  subtitle: '<p>Add a message for this slide.</p>',
  buttonText: '',
  buttonLink: '#',
  buttonVariant: 'gold',
};

const SliderBlockEditor = ({ block, onChange }) => {
  const content = block.content || {};
  const slides = content.slides?.length ? content.slides : [{ ...SLIDER_DEFAULT_SLIDE, id: `slide-${Date.now()}` }];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = slides[Math.min(selectedIndex, slides.length - 1)];

  const updateContent = (updates) => onChange({ ...content, ...updates });
  const updateSlide = (updates) => {
    const nextSlides = slides.map((slide, index) => index === selectedIndex ? { ...slide, ...updates } : slide);
    updateContent({ slides: nextSlides });
  };
  const addSlide = () => {
    const next = { ...SLIDER_DEFAULT_SLIDE, id: `slide-${Date.now()}` };
    updateContent({ slides: [...slides, next] });
    setSelectedIndex(slides.length);
  };
  const removeSlide = () => {
    if (slides.length === 1) return;
    const nextSlides = slides.filter((_, index) => index !== selectedIndex);
    updateContent({ slides: nextSlides });
    setSelectedIndex(Math.max(0, Math.min(selectedIndex, nextSlides.length - 1)));
  };
  const moveSlide = (direction) => {
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    const nextSlides = [...slides];
    [nextSlides[selectedIndex], nextSlides[nextIndex]] = [nextSlides[nextIndex], nextSlides[selectedIndex]];
    updateContent({ slides: nextSlides });
    setSelectedIndex(nextIndex);
  };

  return (
    <div className="space-y-5 p-5 bg-surface-raised border border-border rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-base">Slider settings</h3>
          <p className="text-xs text-subtle mt-1">Build rich, media-backed slides with text and calls to action.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={content.autoplay !== false} onChange={e => updateContent({ autoplay: e.target.checked })} />
            Autoplay
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            Delay
            <input type="number" min="1000" step="500" value={content.interval || 6000} onChange={e => updateContent({ interval: Number(e.target.value) || 6000 })} className="w-20 px-2 py-1.5 border border-border rounded" />
            ms
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="text-xs text-muted">Transition
          <select value={content.transition || 'fade'} onChange={e => updateContent({ transition: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
            <option value="fade">Fade</option><option value="slide">Slide</option><option value="none">None</option>
          </select>
        </label>
        <label className="text-xs text-muted">Height
          <select value={content.height || 'large'} onChange={e => updateContent({ height: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
            <option value="medium">Medium</option><option value="large">Large</option><option value="full">Full screen</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted pt-5"><input type="checkbox" checked={content.showArrows !== false} onChange={e => updateContent({ showArrows: e.target.checked })} /> Arrows</label>
        <label className="flex items-center gap-2 text-xs text-muted pt-5"><input type="checkbox" checked={content.showDots !== false} onChange={e => updateContent({ showDots: e.target.checked })} /> Dots</label>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {slides.map((slide, index) => (
          <button key={slide.id || index} type="button" onClick={() => setSelectedIndex(index)} className={`shrink-0 w-28 h-16 rounded border text-left p-2 text-xs overflow-hidden ${index === selectedIndex ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`} style={{ backgroundColor: slide.backgroundColor || '#152b45' }}>
            <span className="block text-white font-semibold truncate">{index + 1}. {slide.title?.replace(/<[^>]+>/g, '') || 'Untitled'}</span>
          </button>
        ))}
        <button type="button" onClick={addSlide} className="shrink-0 w-28 h-16 border-2 border-dashed border-border rounded text-xs text-muted hover:border-primary hover:text-primary">+ Add slide</button>
      </div>

      {selected && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Slide {selectedIndex + 1}</h4>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveSlide(-1)} disabled={selectedIndex === 0} className="px-2 py-1 text-xs border border-border rounded disabled:opacity-40">←</button>
              <button type="button" onClick={() => moveSlide(1)} disabled={selectedIndex === slides.length - 1} className="px-2 py-1 text-xs border border-border rounded disabled:opacity-40">→</button>
              <button type="button" onClick={removeSlide} disabled={slides.length === 1} className="px-2 py-1 text-xs border border-danger text-danger rounded disabled:opacity-40">Remove</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-xs text-muted">Background type
              <select value={selected.backgroundType || 'color'} onChange={e => updateSlide({ backgroundType: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
                <option value="color">Color</option><option value="gradient">Gradient</option><option value="image">Image</option><option value="video">HTML5 video</option><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option>
              </select>
            </label>
            <label className="text-xs text-muted">Overlay
              <select value={selected.overlay || 'dark'} onChange={e => updateSlide({ overlay: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
                <option value="dark">Dark</option><option value="light">Light</option><option value="none">None</option>
              </select>
            </label>
            <label className="text-xs text-muted">Horizontal alignment
              <select value={selected.textAlign || 'left'} onChange={e => updateSlide({ textAlign: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
                <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
              </select>
            </label>
            <label className="text-xs text-muted">Vertical alignment
              <select value={selected.verticalAlign || 'center'} onChange={e => updateSlide({ verticalAlign: e.target.value })} className="mt-1 w-full px-2 py-2 border border-border rounded bg-surface">
                <option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option>
              </select>
            </label>
          </div>

          {selected.backgroundType === 'color' && (
            <div className="flex items-center gap-3"><ColorPicker value={selected.backgroundColor || '#152b45'} onChange={value => updateSlide({ backgroundColor: value })} label="Slide background color" /><span className="text-xs font-mono text-muted">{selected.backgroundColor || '#152b45'}</span></div>
          )}
          {(selected.backgroundType === 'gradient' || selected.backgroundType === 'image' || selected.backgroundType === 'video') && (
            <label className="block text-xs text-muted">{selected.backgroundType === 'gradient' ? 'CSS gradient' : selected.backgroundType === 'image' ? 'Background image URL' : 'HTML5 video URL'}
              <input value={selected.backgroundType === 'gradient' ? (selected.gradient || '') : selected.backgroundType === 'image' ? (selected.backgroundImage || '') : (selected.videoUrl || '')} onChange={e => updateSlide(selected.backgroundType === 'gradient' ? { gradient: e.target.value } : selected.backgroundType === 'image' ? { backgroundImage: e.target.value } : { videoUrl: e.target.value })} placeholder={selected.backgroundType === 'gradient' ? 'linear-gradient(135deg, #152b45, #54738e)' : '/uploads/filename'} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" />
            </label>
          )}
          {selected.backgroundType === 'video' && <label className="block text-xs text-muted">Poster image URL<input value={selected.posterImage || ''} onChange={e => updateSlide({ posterImage: e.target.value })} placeholder="/uploads/poster.jpg" className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>}
          {selected.backgroundType === 'youtube' && <label className="block text-xs text-muted">YouTube URL or video ID<input value={selected.youtubeId || ''} onChange={e => updateSlide({ youtubeId: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>}
          {selected.backgroundType === 'vimeo' && <label className="block text-xs text-muted">Vimeo URL or video ID<input value={selected.vimeoId || ''} onChange={e => updateSlide({ vimeoId: e.target.value })} placeholder="https://vimeo.com/..." className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div><label className="text-xs text-muted">Eyebrow</label><RichTextEditor value={selected.eyebrow || ''} onChange={value => updateSlide({ eyebrow: value })} minHeight={90} /></div>
            <div><label className="text-xs text-muted">Title</label><RichTextEditor value={selected.title || ''} onChange={value => updateSlide({ title: value })} minHeight={90} /></div>
            <div><label className="text-xs text-muted">Subtitle</label><RichTextEditor value={selected.subtitle || ''} onChange={value => updateSlide({ subtitle: value })} minHeight={90} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-muted">Button text<input value={selected.buttonText || ''} onChange={e => updateSlide({ buttonText: e.target.value })} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>
            <label className="text-xs text-muted">Button link<input value={selected.buttonLink || ''} onChange={e => updateSlide({ buttonLink: e.target.value })} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>
            <label className="text-xs text-muted">Button style<select value={selected.buttonVariant || 'gold'} onChange={e => updateSlide({ buttonVariant: e.target.value })} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface"><option value="gold">Gold</option><option value="outline">Outline</option><option value="default">Navy</option></select></label>
          </div>
        </div>
      )}
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
          <button type="button" onClick={() => update({ [key]: (content[key] || []).filter((_, i) => i !== index) })} className="px-2 py-2 text-xs text-danger border border-danger rounded">×</button>
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

const DEFAULT_SECTION = {
  columns: 1,
  gap: 24,
  paddingTop: 48,
  paddingBottom: 48,
  paddingLeft: 0,
  paddingRight: 0,
  marginTop: 0,
  marginBottom: 0,
  backgroundColor: null,
};

const makeDefaultBlockContent = (type) => {
  switch (type) {
    case 'slider':       return {
      autoplay: true,
      interval: 6000,
      transition: 'fade',
      showArrows: true,
      showDots: true,
      height: 'large',
      slides: [{
        id: `slide-${Date.now()}`,
        backgroundType: 'color',
        backgroundColor: '#152b45',
        overlay: 'dark',
        textAlign: 'left',
        verticalAlign: 'center',
        eyebrow: '<p>Welcome</p>',
        title: '<p>A place to belong.</p>',
        subtitle: '<p>Add a compelling message here.</p>',
        buttonText: 'Learn more',
        buttonLink: '#',
        buttonVariant: 'gold',
      }],
    };
    case 'hero':         return { title: 'Your Hero Title', subtitle: 'Add a compelling subtitle here' };
    case 'text':         return { content: 'Start writing your content here...' };
    case 'trust-bar':    return { items: [{ number: '01', label: 'One welcoming community' }, { number: '03', label: 'Ways to connect each week' }, { number: '∞', label: 'Room for your next step' }] };
    case 'split-banner': return { eyebrow: 'Your first Sunday', title: 'Come curious. Leave encouraged.', body: 'There is no dress code, no perfect background required, and no pressure to have all the answers.', buttonText: 'What to expect', buttonLink: '#', buttonVariant: 'gold', times: [{ label: 'Sunday morning', value: '9:00 AM · 11:00 AM' }, { label: 'Midweek table', value: 'Wednesdays · 6:30 PM' }] };
    case 'events':       return { eyebrow: 'Coming up', title: 'Make room on your calendar.', items: [{ date: 'AUG 18', title: 'Community Picnic', description: 'Bring a blanket and something to share.', time: '12:30 PM' }] };
    case 'quote':        return { quote: 'A church should be a place where people can come as they are.', citation: 'The community' };
    case 'map':          return { address: '128 Harbor Street, Your City', embedUrl: '' };
    case 'intro':        return { title: 'Introduction', content: 'Add your introduction text here...', buttonText: 'Learn More', buttonLink: '#', buttonVariant: 'gold' };
    case 'features':     return { eyebrow: 'Why Harbor', title: 'A place to belong.', subtitle: 'Highlight what makes your community unique', numbered: false, items: [] };
    case 'highlights':   return { title: 'Highlights', items: [] };
    case 'gallery':      return { title: 'Gallery', images: [] };
    case 'testimonials': return { title: 'Testimonials', testimonials: [] };
    case 'contact':      return { title: 'Contact Us', subtitle: 'Get in touch with our team', email: 'contact@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345', emailLabel: 'Email', phoneLabel: 'Phone', addressLabel: 'Address', reasonOptions: ['General question', 'Visit planning', 'Community care'] };
    case 'video':        return { title: 'Featured Video', videoUrl: '', description: 'Add a video description...' };
    case 'grid':         return { columns: 3, gap: 24, items: [{ width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }] };
    default:             return {};
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AddSectionModal — visual layout picker
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_LAYOUTS = [
  { columns: 1, label: 'Full Width',  preview: [100] },
  { columns: 2, label: '2 Columns',   preview: [50, 50] },
  { columns: 3, label: '3 Columns',   preview: [33, 33, 33] },
  { columns: 4, label: '4 Columns',   preview: [25, 25, 25, 25] },
  { columns: 5, label: '5 Columns',   preview: [20, 20, 20, 20, 20] },
  { columns: 6, label: '6 Columns',   preview: [17, 17, 17, 17, 17, 17] },
];

const SPACING_PRESETS = [
  { label: 'None',   value: 0 },
  { label: 'SM',     value: 24 },
  { label: 'MD',     value: 48 },
  { label: 'LG',     value: 80 },
  { label: 'XL',     value: 120 },
];

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[9999] animate-in fade-in duration-200" onClick={onClose} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-section-title">
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
          <button onClick={onClose} className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors">
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
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionWrapper — hover UI for sections
// ─────────────────────────────────────────────────────────────────────────────

const SectionWrapper = ({ section, sectionIndex, onAddSectionBelow, onDeleteSection, onDuplicateSection, onUpdateSection, children }) => {
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
      <div className={`absolute inset-0 border-2 border-dashed pointer-events-none transition-opacity duration-150 z-10 ${isHovered ? 'border-primary-light opacity-100' : 'border-transparent opacity-0'}`} />

      {/* Section actions toolbar — top-left on hover */}
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

      {/* Inline settings panel */}
      {showSettings && (
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
      <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-150 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => onAddSectionBelow(sectionIndex)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow-lg hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Section
        </button>
      </div>
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

export default function InlineEditor() {
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
    if (historyIndex <= 0) return;
    const previousState = history[historyIndex - 1];
    setSections(previousState.sections);
    setHeader(previousState.header);
    setFooter(previousState.footer);
    setHistoryIndex(historyIndex - 1);
    setLastChangeTime(Date.now());
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextState = history[historyIndex + 1];
    setSections(nextState.sections);
    setHeader(nextState.header);
    setFooter(nextState.footer);
    setHistoryIndex(historyIndex + 1);
    setLastChangeTime(Date.now());
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

  // ── Section-level operations ────────────────────────────────────────────────

  const addSection = (sectionConfig, afterIndex) => {
    const newSection = { ...DEFAULT_SECTION, ...sectionConfig, blocks: sectionConfig.blocks || [] };
    const insertAt = afterIndex == null ? sections.length : afterIndex + 1;
    const newSections = [...sections.slice(0, insertAt), newSection, ...sections.slice(insertAt)];
    setSections(newSections);
    saveToHistory(newSections, header, footer);
    setAddSectionAfterIndex(null);
  };

  const deleteSection = (sIdx) => {
    const newSections = sections.filter((_, i) => i !== sIdx);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  const duplicateSection = (sIdx) => {
    const sec = sections[sIdx];
    const newSec = JSON.parse(JSON.stringify(sec));
    delete newSec.id; // let backend generate a new id
    const newSections = [...sections.slice(0, sIdx + 1), newSec, ...sections.slice(sIdx + 1)];
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  const updateSection = (sIdx, updates) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, ...updates } : s);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
  };

  // ── Block-level operations (within a section) ───────────────────────────────

  const updateSectionBlocks = (sIdx, newBlocks) => {
    const newSections = sections.map((s, i) => i === sIdx ? { ...s, blocks: newBlocks } : s);
    setSections(newSections);
    saveToHistory(newSections, header, footer);
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

  // Custom renderer for editable blocks
  // sIdx = section index, bIdx = block index within that section
  const renderEditableBlock = (block, sIdx, bIdx) => {
    // Local shorthand so all block JSX below uses ubc/ub instead of spelling out sIdx/bIdx
    const ubc = (updates) => updateBlockContent(sIdx, bIdx, updates);
    const ub  = (updates) => updateBlock(sIdx, bIdx, updates);
    const blockComponents = {
      slider: () => (
        <SliderBlockEditor block={block} onChange={ubc} />
      ),
      hero: () => (
        <HeroBlock
          block={block}
          index={bIdx}
          updateBlockContent={(idx, updates) => updateBlockContent(sIdx, idx, updates)}
          updateBlock={(idx, updates) => updateBlock(sIdx, idx, updates)}
          EditableText={EditableText}
        />
      ),
      text: () => (
        <div className="py-8 px-6 max-w-3xl mx-auto">
          <RichTextEditor
            value={block.content.content}
            onChange={(value) => updateBlockContent(sIdx, bIdx, { content: value })}
            placeholder="Start writing your content here…"
            minHeight={220}
          />
        </div>
      ),
      'trust-bar': () => <StructuredBlockEditor block={block} onChange={ubc} />,
      'split-banner': () => <StructuredBlockEditor block={block} onChange={ubc} />,
      events: () => <StructuredBlockEditor block={block} onChange={ubc} />,
      quote: () => <StructuredBlockEditor block={block} onChange={ubc} />,
      map: () => <StructuredBlockEditor block={block} onChange={ubc} />,
      intro: () => (
        <div className="py-20 px-6 text-center bg-surface-raised">
          <EditableText
            content={block.content.title}
            onChange={(value) => updateBlockContent(sIdx, bIdx, { title: value })}
            placeholder="Introduction Title"
            className="text-4xl font-bold mb-6 block"
            tag="h2"
          />
          <EditableText
            content={block.content.content}
            onChange={(value) => updateBlockContent(sIdx, bIdx, { content: value })}
            placeholder="Introduction content"
            className="text-xl max-w-3xl mx-auto font-light leading-relaxed mb-8 block text-muted"
            tag="div"
            multiline
          />
          <EditableButton
            text={block.content.buttonText}
            href={block.content.buttonLink}
            onChange={({ text, href }) => updateBlockContent(sIdx, bIdx, { buttonText: text, buttonLink: href })}
            placeholder="Button Text"
            className="inline-block bg-primary text-primary-foreground font-bold px-8 py-4 rounded-base hover:bg-primary-hover transition-colors duration-150"
          />
        </div>
      ),
      features: () => (
        <div className="py-20 px-6 max-w-6xl mx-auto text-center">
          <EditableText
            content={block.content.eyebrow}
            onChange={(value) => ubc({ eyebrow: value })}
            placeholder="Features Eyebrow"
            className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block"
            tag="div"
          />
          <EditableText
            content={block.content.title}
            onChange={(value) => ubc({ title: value })}
            placeholder="Features Title"
            className="text-3xl font-bold text-base mb-2 block"
            tag="h2"
          />
          <EditableText
            content={block.content.subtitle}
            onChange={(value) => ubc({ subtitle: value })}
            placeholder="Features Subtitle"
            className="text-xl text-muted font-light mb-12 block"
            tag="div"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(block.content.items || []).map((item, i) => (
              <div key={i} className="text-center p-6 border border-border rounded-base">
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{item.icon || '⭐'}</span>
                </div>
                <EditableText
                  content={item.title}
                  onChange={(value) => {
                    const items = [...(block.content.items || [])];
                    items[i] = { ...items[i], title: value };
                    ubc({ items });
                  }}
                  placeholder="Feature Title"
                  className="text-xl font-semibold text-text-base mb-2 block"
                  tag="h3"
                />
                <EditableText
                  content={item.description}
                  onChange={(value) => {
                    const items = [...(block.content.items || [])];
                    items[i] = { ...items[i], description: value };
                    ubc({ items });
                  }}
                  placeholder="Feature Description"
                  className="text-muted block"
                  tag="div"
                  multiline
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button type="button" onClick={() => ubc({ items: [...(block.content.items || []), { icon: 'lucide-star', number: String((block.content.items || []).length + 1).padStart(2, '0'), title: 'New feature', description: 'Describe this feature.' }] })} className="px-3 py-2 text-xs border border-dashed border-border rounded text-muted hover:border-primary hover:text-primary">+ Add feature</button>
            <label className="text-xs text-muted"><input type="checkbox" checked={block.content.numbered === true} onChange={e => ubc({ numbered: e.target.checked })} /> Numbered</label>
          </div>
        </div>
      ),
      highlights: () => (
        <div className="py-20 px-6 bg-surface-raised">
          <div className="max-w-6xl mx-auto text-center">
            <EditableText
              content={block.content.title}
              onChange={(value) => ubc({ title: value })}
              placeholder="Highlights Title"
              className="text-3xl font-bold text-base mb-12 block"
              tag="h2"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(block.content.items || []).map((item, i) => (
                <div key={i} className="bg-surface rounded-base shadow-card overflow-hidden">
                  <EditableImage
                    src={item.imageUrl}
                    alt={item.title}
                    onChange={(url) => {
                      const items = [...(block.content.items || [])];
                      items[i] = { ...items[i], imageUrl: url };
                      ubc({ items });
                    }}
                    onRemove={() => {
                      const items = [...(block.content.items || [])];
                      items[i] = { ...items[i], imageUrl: '' };
                      ubc({ items });
                    }}
                    className="w-full h-48 object-cover"
                    placeholder="Click to add image"
                  />
                  <div className="p-6">
                    <EditableText
                      content={item.title}
                      onChange={(value) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], title: value };
                        ubc({ items });
                      }}
                      placeholder="Highlight Title"
                      className="text-xl font-semibold text-base mb-2 block"
                      tag="h3"
                    />
                    <EditableText
                      content={item.description}
                      onChange={(value) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], description: value };
                        ubc({ items });
                      }}
                      placeholder="Highlight Description"
                      className="text-muted block"
                      tag="div"
                      multiline
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      gallery: () => (
        <div className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <EditableText
              content={block.content.title}
              onChange={(value) => ubc({ title: value })}
              placeholder="Gallery Title"
              className="text-3xl font-bold text-text-base mb-12 text-center block"
              tag="h2"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(block.content.images || []).map((image, i) => (
                <div key={i} className="relative group">
                  <EditableImage
                    src={image.url}
                    alt={image.caption}
                    onChange={(url) => {
                      const images = [...(block.content.images || [])];
                      images[i] = { ...images[i], url };
                      ubc({ images });
                    }}
                    onRemove={() => {
                      const images = (block.content.images || []).filter((_, idx) => idx !== i);
                      ubc({ images });
                    }}
                    className="w-full h-64 object-cover rounded-base"
                    placeholder="Click to add image"
                  />
                  {image.caption && (
                    <div className="mt-2 text-center">
                      <EditableText
                        content={image.caption}
                        onChange={(value) => {
                          const images = [...(block.content.images || [])];
                          images[i] = { ...images[i], caption: value };
                          ubc({ images });
                        }}
                        placeholder="Image Caption"
                        className="text-small text-muted block"
                        tag="div"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      testimonials: () => (
        <div className="py-20 px-6 bg-surface-raised">
          <div className="max-w-4xl mx-auto">
            <EditableText
              content={block.content.title}
              onChange={(value) => ubc({ title: value })}
              placeholder="Testimonials Title"
              className="text-3xl font-bold text-base mb-12 text-center block"
              tag="h2"
            />
            <div className="space-y-8">
              {(block.content.testimonials || []).map((testimonial, i) => (
                <div key={i} className="bg-surface rounded-base shadow-card p-8 text-center">
                  <EditableText
                    content={testimonial.quote}
                    onChange={(value) => {
                      const testimonials = [...(block.content.testimonials || [])];
                      testimonials[i] = { ...testimonials[i], quote: value };
                      ubc({ testimonials });
                    }}
                    placeholder="Customer testimonial quote"
                    className="text-xl text-muted italic mb-6 block"
                    tag="blockquote"
                    multiline
                  />
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-left">
                      <EditableText
                        content={testimonial.author}
                        onChange={(value) => {
                          const testimonials = [...(block.content.testimonials || [])];
                          testimonials[i] = { ...testimonials[i], author: value };
                          ubc({ testimonials });
                        }}
                        placeholder="Author Name"
                        className="font-semibold text-base block"
                        tag="div"
                      />
                      <EditableText
                        content={testimonial.role}
                        onChange={(value) => {
                          const testimonials = [...(block.content.testimonials || [])];
                          testimonials[i] = { ...testimonials[i], role: value };
                          ubc({ testimonials });
                        }}
                        placeholder="Author Role"
                        className="text-muted block"
                        tag="div"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      contact: () => (
        <div className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <EditableText
              content={block.content.title}
              onChange={(value) => ubc({ title: value })}
              placeholder="Contact Title"
              className="text-3xl font-bold text-base mb-2 block"
              tag="h2"
            />
            <EditableText
              content={block.content.subtitle}
              onChange={(value) => ubc({ subtitle: value })}
              placeholder="Contact Subtitle"
              className="text-xl text-muted mb-12 block"
              tag="div"
            />
            <div className="bg-surface rounded-base shadow-card p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-label text-muted mb-2">Email</label>
                  <EditableText
                    content={block.content.email}
                    onChange={(value) => ubc({ email: value })}
                    placeholder="contact@example.com"
                    className="text-lg text-primary block"
                    tag="a"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Phone</label>
                  <EditableText
                    content={block.content.phone}
                    onChange={(value) => ubc({ phone: value })}
                    placeholder="+1 (555) 123-4567"
                    className="text-lg text-base block"
                    tag="div"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Address</label>
                  <EditableText
                    content={block.content.address}
                    onChange={(value) => ubc({ address: value })}
                    placeholder="123 Main St, City, State 12345"
                    className="text-lg text-base block"
                    tag="div"
                    multiline
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={block.content.showForm === true} onChange={e => ubc({ showForm: e.target.checked })} /> Include contact form on the public page</label>
                {block.content.showForm && <label className="block text-xs text-muted">Reason options (comma separated)<input value={(block.content.reasonOptions || []).join(', ')} onChange={e => ubc({ reasonOptions: e.target.value.split(',').map(option => option.trim()).filter(Boolean) })} className="mt-1 w-full px-3 py-2 border border-border rounded bg-surface" /></label>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {['emailLabel', 'phoneLabel', 'addressLabel'].map(key => <input key={key} value={block.content[key] || ''} onChange={e => ubc({ [key]: e.target.value })} placeholder={key.replace('Label', ' label')} className="px-2 py-2 border border-border rounded bg-surface text-xs" />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      video: () => (
        <div className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <EditableText
              content={block.content.title}
              onChange={(value) => ubc({ title: value })}
              placeholder="Video Title"
              className="text-3xl font-bold text-base mb-8 block"
              tag="h2"
            />
            {block.content.videoUrl ? (
              <div className="aspect-w-16 aspect-h-9 mb-8">
                <iframe
                  src={block.content.videoUrl}
                  className="w-full h-96 rounded-base"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="bg-surface-raised rounded-base p-12 mb-8">
                <div className="text-muted">
                  <div className="w-16 h-16 bg-border rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎥</span>
                  </div>
                  <p>Click to add video URL</p>
                </div>
              </div>
            )}
            <EditableText
              content={block.content.description}
              onChange={(value) => ubc({ description: value })}
              placeholder="Video description"
              className="text-lg text-muted block"
              tag="div"
              multiline
            />
            <div className="mt-4">
              <label className="block text-label text-muted mb-2">Video URL</label>
              <input
                type="url"
                value={block.content.videoUrl || ''}
                onChange={(e) => ubc({ videoUrl: e.target.value })}
                className="w-full px-3 py-2.5 border border-border-strong rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
          </div>
        </div>
      ),
      grid: () => (
        <div className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${block.content.columns || 3}, 1fr)`, gap: `${block.content.gap || 24}px` }}>
              {(block.content.items || []).map((column, colIndex) => (
                <div key={colIndex} className="border border-border rounded-base p-4">
                  <div className="text-small text-muted mb-4">Column {colIndex + 1}</div>
                  <div className="space-y-4">
                    {(column.blocks || []).map((nestedBlock, blockIndex) => (
                      <div key={blockIndex} className="p-4 bg-surface-raised rounded border border-border">
                        <div className="text-small font-medium text-muted mb-2">{nestedBlock.type}</div>
                        <div className="text-small text-subtle">
                          {Object.entries(nestedBlock.content).map(([key, value]) => (
                            <div key={key}>{key}: {typeof value === 'string' ? value.substring(0, 30) + '...' : JSON.stringify(value).substring(0, 30) + '...'}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addNestedBlock(sIdx, bIdx, colIndex, 'text')}
                      className="w-full px-3 py-2.5 min-h-[44px] border border-border rounded text-primary hover:bg-primary-light text-small transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    >
                      + Add Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    };

    const BlockComponent = blockComponents[block.type];
    if (!BlockComponent) {
      return (
        <div className="p-8 border-2 border-dashed border-border rounded-base text-center">
          <p className="text-muted">Unknown block type: {block.type}</p>
        </div>
      );
    }

    return <BlockComponent />;
  };

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
            <BuilderHistoryControls onUndo={handleUndo} onRedo={handleRedo} canUndo={historyIndex > 0} canRedo={historyIndex < history.length - 1} />

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
                <span className="hidden sm:inline">{templateSaving ? 'Saving…' : 'Save template'}</span>
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

            </div>
          </div>
        </div>
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
                      <span className="text-primary mt-0.5">•</span>
                      <span>Click any text to edit it inline with auto-save</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Hover over blocks to reveal action toolbar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Drag blocks to reorder them on the page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Use the style panel (palette icon) for advanced styling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
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
  );
}