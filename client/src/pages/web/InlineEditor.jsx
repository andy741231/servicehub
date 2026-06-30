import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, Trash2, GripVertical, Image as ImageIcon, Eye, Monitor, Smartphone, Tablet, 
  Palette, Type, Settings, Save, X, Check, AlertCircle, ChevronDown, ChevronUp,
  Link as LinkIcon, Edit3, Move, Copy, Upload,
  Zap, AlignLeft, AlignCenter, AlignRight, AlignJustify, Hand, Star, Sparkles, LayoutGrid, MessageSquare, Mail, Video, Columns,
  Bold, Italic, Rows3, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus, ExternalLink, HelpCircle
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../utils/api';

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
  { id: 'hero',         name: 'Hero',         Icon: Zap,          description: 'Large hero section with title and subtitle' },
  { id: 'text',         name: 'Text',         Icon: AlignLeft,    description: 'Text content with markdown support' },
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
            className={`p-2 min-h-[36px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
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
          className={`p-2 min-h-[36px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
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
          className={`p-2 min-h-[36px] rounded-base transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
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
            className="p-2 min-h-[36px] hover:bg-danger-light text-danger rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
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
          className="prose prose-sm max-w-none px-4 py-3 min-h-[220px] bg-surface prose-headings:font-bold prose-p:mb-3 prose-a:text-blue-600"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-modal p-6 max-w-md w-full">
            <h3 className="text-heading font-semibold mb-4">Edit Image</h3>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-modal p-6 max-w-md w-full">
            <h3 className="text-heading font-semibold mb-4">Edit Button</h3>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
      <div className="bg-surface rounded-lg shadow-modal p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading font-semibold">Background Image</h3>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className={`p-2 min-h-[36px] rounded-base hover:bg-surface-raised transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showQuickActions ? 'bg-primary-light text-primary' : 'text-muted'}`}
              title="Quick actions"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowStylePanel(!showStylePanel)}
              className={`p-2 min-h-[36px] rounded-base hover:bg-surface-raised transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${showStylePanel ? 'bg-primary-light text-primary' : 'text-muted'}`}
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
                className="p-2 min-h-[36px] rounded-base hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onMoveDown(index)}
                disabled={false}
                className="p-2 min-h-[36px] rounded-base hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button
                onClick={() => onDuplicate(index)}
                className="p-2 min-h-[36px] rounded-base hover:bg-surface-raised text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(index)}
                className="p-2 min-h-[36px] rounded-base hover:bg-danger-light text-danger transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-1"
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200] transition-opacity"
            onClick={() => setShowStylePanel(false)}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-[201] flex flex-col animate-in slide-in-from-right duration-300">
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
                className="p-2 min-h-[36px] hover:bg-surface rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Background Section */}
              <div className="space-y-4">
                <h5 className="text-small font-semibold text-muted uppercase tracking-wider">Background</h5>
                
                {/* Background Image - Only for hero blocks */}
                {block.type === 'hero' && (
                  <div className="bg-gray-50 rounded-lg p-4">
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
                    <div className="relative">
                      <input 
                        type="color" 
                        value={block.style?.backgroundColor || '#ffffff'} 
                        onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })} 
                        className="w-12 h-12 border-2 border-border rounded-base cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                      />
                      <div className="absolute inset-0 pointer-events-none rounded-base border border-black/10" />
                    </div>
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
                    <div className="relative">
                      <input
                        type="color"
                        value={block.style?.color || '#000000'}
                        onChange={(e) => handleStyleUpdate({ color: e.target.value })}
                        className="w-12 h-12 border-2 border-border rounded-base cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      />
                      <div className="absolute inset-0 pointer-events-none rounded-base border border-black/10" />
                    </div>
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
                      <div className="relative">
                        <input 
                          type="color" 
                          value={block.style?.borderColor || '#e5e7eb'} 
                          onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })} 
                          className="w-full h-10 border border-border rounded-base cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1" 
                        />
                        <div className="absolute inset-0 pointer-events-none rounded-base border border-black/10" />
                      </div>
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
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowBlockMenu(false); }}
        >
          <div className="bg-surface rounded-lg shadow-modal w-80" onMouseDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h4 className="font-semibold text-base capitalize">{block.type} Block Settings</h4>
              <button onClick={() => setShowBlockMenu(false)} className="p-2 min-h-[36px] hover:bg-surface-raised rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
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
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${block.hidden ? 'left-1' : 'left-5'}`} />
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
    case 'hero':         return { title: 'Your Hero Title', subtitle: 'Add a compelling subtitle here' };
    case 'text':         return { content: 'Start writing your content here...' };
    case 'intro':        return { title: 'Introduction', content: 'Add your introduction text here...', buttonText: 'Learn More', buttonLink: '#' };
    case 'features':     return { title: 'Key Features', subtitle: 'Highlight what makes you unique', items: [] };
    case 'highlights':   return { title: 'Highlights', items: [] };
    case 'gallery':      return { title: 'Gallery', images: [] };
    case 'testimonials': return { title: 'Testimonials', testimonials: [] };
    case 'contact':      return { title: 'Contact Us', subtitle: 'Get in touch with our team', email: 'contact@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345' };
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Rows3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Add Section</h3>
              <p className="text-sm text-gray-500">Choose a layout for your new section</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Layout picker */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Layout</h4>
            <div className="grid grid-cols-3 gap-3">
              {SECTION_LAYOUTS.map(layout => (
                <button
                  key={layout.columns}
                  onClick={() => setSelectedLayout(layout)}
                  className={`p-4 border-2 rounded-xl text-left transition-all duration-150 ${selectedLayout.columns === layout.columns ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}
                >
                  {/* Mini column preview */}
                  <div className="flex gap-1 mb-2 h-8">
                    {layout.preview.map((w, i) => (
                      <div key={i} className={`rounded h-full ${selectedLayout.columns === layout.columns ? 'bg-blue-300' : 'bg-gray-200'}`} style={{ flex: w }} />
                    ))}
                  </div>
                  <div className={`text-sm font-medium ${selectedLayout.columns === layout.columns ? 'text-blue-700' : 'text-gray-700'}`}>{layout.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Padding */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vertical Padding</h4>
            <div className="flex gap-2 mb-3">
              {SPACING_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPaddingPreset(p.label); setPaddingCustomTop(''); setPaddingCustomBottom(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${paddingPreset === p.label && paddingCustomTop === '' && paddingCustomBottom === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Top (px)</label>
                <input type="number" value={paddingCustomTop} onChange={e => setPaddingCustomTop(e.target.value)} placeholder={String(SPACING_PRESETS.find(p => p.label === paddingPreset)?.value ?? 48)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Bottom (px)</label>
                <input type="number" value={paddingCustomBottom} onChange={e => setPaddingCustomBottom(e.target.value)} placeholder={String(SPACING_PRESETS.find(p => p.label === paddingPreset)?.value ?? 48)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Margin */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vertical Margin</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Top (px)</label>
                <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Bottom (px)</label>
                <input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Background color */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Background Color</h4>
            <div className="flex items-center gap-3">
              <input type="color" value={bgColor || '#ffffff'} onChange={e => setBgColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} placeholder="e.g. #f9fafb or transparent" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {bgColor && <button onClick={() => setBgColor('')} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
          <button onClick={handleAdd} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
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
      <div className={`absolute inset-0 border-2 border-dashed pointer-events-none transition-opacity duration-150 z-10 ${isHovered ? 'border-blue-400 opacity-100' : 'border-transparent opacity-0'}`} />

      {/* Section actions toolbar — top-left on hover */}
      <div className={`absolute top-2 left-2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-1 transition-all duration-150 ${isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <span className="px-2 text-xs font-medium text-gray-500 border-r border-gray-200 mr-1">Section {sectionIndex + 1}</span>
        <button
          onClick={() => setShowSettings(s => !s)}
          title="Section settings"
          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDuplicateSection(sectionIndex)}
          title="Duplicate section"
          className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDeleteSection(sectionIndex)}
          title="Delete section"
          className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline settings panel */}
      {showSettings && (
        <div className="absolute top-10 left-2 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Section Settings</h4>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="space-y-3">
            {/* Columns */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Columns</label>
              <div className="flex gap-1">
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => onUpdateSection(sectionIndex, { columns: n })}
                    className={`flex-1 py-1 text-xs rounded ${section.columns === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{n === 1 ? 'Full' : n}</button>
                ))}
              </div>
            </div>
            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Padding Top</label>
                <input type="number" value={section.paddingTop ?? 48} onChange={e => onUpdateSection(sectionIndex, { paddingTop: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Padding Bottom</label>
                <input type="number" value={section.paddingBottom ?? 48} onChange={e => onUpdateSection(sectionIndex, { paddingBottom: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Margin Top</label>
                <input type="number" value={section.marginTop ?? 0} onChange={e => onUpdateSection(sectionIndex, { marginTop: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Margin Bottom</label>
                <input type="number" value={section.marginBottom ?? 0} onChange={e => onUpdateSection(sectionIndex, { marginBottom: Number(e.target.value) })} className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            {/* Background color */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Background Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={section.backgroundColor || '#ffffff'} onChange={e => onUpdateSection(sectionIndex, { backgroundColor: e.target.value })} className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
                <input type="text" value={section.backgroundColor || ''} onChange={e => onUpdateSection(sectionIndex, { backgroundColor: e.target.value || null })} placeholder="transparent" className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-semibold shadow-lg hover:bg-blue-700 transition-colors"
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
    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 text-sm font-medium group"
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
        if (historyIndex > 0) {
          const previousState = history[historyIndex - 1];
          setSections(previousState.sections);
          setHeader(previousState.header);
          setFooter(previousState.footer);
          setHistoryIndex(historyIndex - 1);
          setLastChangeTime(Date.now());
        }
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1];
          setSections(nextState.sections);
          setHeader(nextState.header);
          setFooter(nextState.footer);
          setHistoryIndex(historyIndex + 1);
          setLastChangeTime(Date.now());
        }
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
          <MarkdownContentEditor
            value={block.content.content}
            onChange={(value) => updateBlockContent(sIdx, bIdx, { content: value })}
          />
        </div>
      ),
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
                  className="text-xl font-semibold text-gray-900 mb-2 block"
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
                  className="text-gray-600 block"
                  tag="div"
                  multiline
                />
              </div>
            ))}
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
              className="text-3xl font-bold text-gray-800 mb-12 text-center block"
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
            {/* Device preview - improved */}
            <div className="flex items-center gap-2 bg-surface-raised rounded-xl p-1.5">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-2.5 min-h-[44px] rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${previewDevice === 'desktop' ? 'bg-surface shadow-card text-primary' : 'text-muted hover:bg-surface'}`}
                title="Desktop view"
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-2.5 min-h-[44px] rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${previewDevice === 'tablet' ? 'bg-surface shadow-card text-primary' : 'text-muted hover:bg-surface'}`}
                title="Tablet view"
              >
                <Tablet className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-2.5 min-h-[44px] rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${previewDevice === 'mobile' ? 'bg-surface shadow-card text-primary' : 'text-muted hover:bg-surface'}`}
                title="Mobile view"
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>

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

            {/* Save status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-raised border border-border min-w-[120px] justify-center">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-small text-primary font-medium">
                  <AlertCircle className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-small text-success font-medium">
                  <Check className="w-4 h-4" />
                  All changes saved
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 text-small text-danger font-medium">
                  <X className="w-4 h-4" />
                  Save failed
                </div>
              )}
              {saveStatus === 'unsaved' && (
                <div className="flex items-center gap-2 text-small text-muted">
                  <div className="w-2 h-2 rounded-full bg-border" />
                  Unsaved changes
                </div>
              )}
              {saveStatus === 'idle' && (
                <div className="flex items-center gap-2 text-small text-muted">
                  <Check className="w-4 h-4 opacity-40" />
                  Saved
                </div>
              )}
            </div>

            {/* Actions - improved styling */}
            <div className="flex items-center gap-3">
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

      {/* Main editor area — sections */}
      <div className="flex">
        <div className="flex-1">
          <div className={`min-h-screen ${previewDevice === 'desktop' ? 'bg-surface' : 'bg-surface-raised py-8'}`}>
            <div className={`${deviceClasses[previewDevice]} bg-surface min-h-screen ${previewDevice !== 'desktop' ? 'rounded-xl overflow-hidden' : ''}`}>

              {/* Empty state */}
              {sections.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Rows3 className="w-10 h-10 text-blue-400" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Start building your page</h2>
                    <p className="text-gray-500 mb-6">Add your first section to get started</p>
                    <button
                      onClick={() => setAddSectionAfterIndex(-1)}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg font-semibold text-lg"
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
                <div className="p-8 text-center border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
                  <button
                    onClick={() => setAddSectionAfterIndex(sections.length - 1)}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 font-semibold text-lg"
                  >
                    <Plus className="w-6 h-6" />
                    Add Section
                  </button>
                  <p className="mt-3 text-sm text-gray-500">
                    or press <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono">+</kbd> to add a section
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Add Block</h3>
                    <p className="text-sm text-gray-500">Choose a block type to add to this section</p>
                  </div>
                </div>
                <button
                  onClick={() => setBlockPaletteTarget(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {BLOCK_TYPES.map(({ id, name, Icon, description }) => (
                  <button
                    key={id}
                    onClick={() => addBlockToSection(blockPaletteTarget.sectionIndex, id)}
                    className="p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg transition-all duration-200 text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Icon className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">{name}</div>
                        <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Type className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h3>
                    <p className="text-sm text-gray-500">Speed up your editing workflow</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-gray-600" />
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
                    <div key={action} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium">{action}</span>
                      <kbd className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-mono shadow-sm">{shortcut}</kbd>
                    </div>
                  ))}
                </div>
                
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Pro Tips
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Click any text to edit it inline with auto-save</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Hover over blocks to reveal action toolbar</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Drag blocks to reorder them on the page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Use the style panel (palette icon) for advanced styling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
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