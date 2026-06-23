import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, Trash2, GripVertical, Image as ImageIcon, Eye, Monitor, Smartphone, Tablet, 
  Palette, Type, Settings, Save, X, Check, AlertCircle, ChevronDown, ChevronUp,
  Link as LinkIcon, Edit3, Move, Copy, Upload,
  Zap, AlignLeft, AlignCenter, AlignRight, AlignJustify, Hand, Star, Sparkles, LayoutGrid, MessageSquare, Mail, Video, Columns,
  Bold, Italic
} from 'lucide-react';
import { marked } from 'marked';
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

// Editable text component
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
          className={`${className} border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white`}
          style={style}
          placeholder={placeholder}
          {...(multiline ? { rows: 3 } : {})}
        />
        {isSaving && (
          <div className="absolute -top-8 right-0 text-xs text-blue-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
        {showSaved && (
          <div className="absolute -top-8 right-0 text-xs text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </div>
        )}
      </div>
    );
  }

  return (
    <Tag 
      className={`${className} cursor-text hover:bg-white/10 hover:rounded hover:px-1 transition-colors group relative focus:outline-none focus:ring-2 focus:ring-blue-300 rounded`}
      style={style}
      onClick={handleClick}
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
      {content || <span className="opacity-50 italic">{placeholder}</span>}
      <Edit3 className="w-3 h-3 absolute -top-4 right-0 opacity-0 group-hover:opacity-50 text-blue-500" />
    </Tag>
  );
};

// Inline formatting toolbar for editable text inside a block
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

  const toggleBold = () => { console.log('toggleBold'); update('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold'); };
  const toggleItalic = () => update('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic');

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 ${
        position === 'top' ? '-top-11' : 'bottom-full mb-2'
      } flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-md p-1 z-40`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <select
        value={fontFamily}
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => update('fontFamily', e.target.value)}
        title="Font family"
        className="h-7 px-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Default</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times New Roman</option>
        <option value="Courier New, monospace">Courier New</option>
        <option value="Verdana, sans-serif">Verdana</option>
      </select>

      <input
        type="number"
        min={8}
        max={120}
        value={fontSize || ''}
        onMouseDown={(e) => e.preventDefault()}
        onChange={(e) => update('fontSize', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        placeholder="Size"
        title="Font size (px)"
        className="w-14 h-7 px-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      <div className="w-px h-4 bg-gray-300 mx-1" />

      {alignOptions.map(({ id, Icon }) => (
        <button
          key={id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => update('textAlign', id)}
          className={`p-1 rounded ${textAlign === id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
          title={`Align ${id}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}

      <div className="w-px h-4 bg-gray-300 mx-1" />

      <button
        onMouseDown={(e) => { console.log('Bold mousedown'); e.preventDefault(); }}
        onClick={toggleBold}
        className={`p-1 rounded ${fontWeight === 'bold' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleItalic}
        className={`p-1 rounded ${fontStyle === 'italic' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      {onDelete && (
        <>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onDelete}
            className="p-1 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

// Dedicated hero block editor with per-field formatting toolbars
const HeroBlock = ({ block, index, updateBlockContent, updateBlock, EditableText }) => {
  const [activeField, setActiveField] = useState(null); // 'title' | 'subtitle' | null
  const [hoverField, setHoverField] = useState(null);
  const hoverTimeout = useRef(null);

  const setHover = (field) => {
    clearTimeout(hoverTimeout.current);
    setHoverField(field);
  };
  const clearHover = () => {
    hoverTimeout.current = setTimeout(() => setHoverField(null), 200);
  };

  useEffect(() => () => clearTimeout(hoverTimeout.current), []);

  const endEditing = (_e, _field) => {
    // Toolbar has onMouseDown={e => e.preventDefault()} to keep focus in the input,
    // so this fires only when focus truly leaves to somewhere outside the toolbar.
    setActiveField(null);
  };

  const titleColor = block.style?.color || (block.content.backgroundImage ? '#ffffff' : '#1e3a8a');
  const subtitleColor = block.style?.color || (block.content.backgroundImage ? '#e2e8f0' : '#475569');

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
        <div className="relative inline-block w-full">
          {(activeField === 'title' || hoverField === 'title') && (
            <div
              onMouseEnter={() => setHover('title')}
              onMouseLeave={clearHover}
            >
              <TextToolbar
                format={titleFormat}
                onChange={updateTitleFormat}
                onDelete={() => updateBlockContent(index, { title: '' })}
              />
            </div>
          )}
          <EditableText
            content={block.content.title}
            onChange={(value) => updateBlockContent(index, { title: value })}
            placeholder="Hero Title"
            className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 block"
            style={titleStyle}
            tag="h1"
            onEditingStart={() => setActiveField('title')}
            onEditingEnd={(e) => endEditing(e, 'title')}
          />
        </div>
        <div className="relative inline-block w-full">
          {(activeField === 'subtitle' || hoverField === 'subtitle') && (
            <div
              onMouseEnter={() => setHover('subtitle')}
              onMouseLeave={clearHover}
            >
              <TextToolbar
                format={subtitleFormat}
                onChange={updateSubtitleFormat}
                onDelete={() => updateBlockContent(index, { subtitle: '' })}
              />
            </div>
          )}
          <EditableText
            content={block.content.subtitle}
            onChange={(value) => updateBlockContent(index, { subtitle: value })}
            placeholder="Hero Subtitle"
            className="text-xl max-w-2xl mx-auto block"
            style={subtitleStyle}
            tag="p"
            multiline
            onEditingStart={() => setActiveField('subtitle')}
            onEditingEnd={(e) => endEditing(e, 'subtitle')}
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
          className={`${className} cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-300 rounded`}
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
          className={`${className} border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300`}
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
          <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
          <span className="text-gray-500 text-sm">{placeholder}</span>
        </div>
      )}

      {/* Hover controls */}
      {src && showControls && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center gap-2">
          <button
            onClick={() => setShowUrlDialog(true)}
            className="px-3 py-2 bg-white text-gray-800 rounded hover:bg-gray-100 flex items-center gap-1"
          >
            <Edit3 className="w-4 h-4" />
            Replace
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-white text-gray-800 rounded hover:bg-gray-100 flex items-center gap-1"
          >
            <ImageIcon className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={onRemove}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}

      {/* URL dialog */}
      {showUrlDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1"
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
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlSave}
                  disabled={!tempUrl.trim() || isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
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
        className={`${className} hover:opacity-90 transition-opacity relative`}
        onClick={handleButtonClick}
      >
        {text || placeholder}
        <Edit3 className="w-3 h-3 absolute -top-2 -right-2 opacity-0 group-hover:opacity-50 text-blue-500" />
      </button>

      {/* Edit dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Button</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={placeholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <input
                  type="url"
                  value={tempHref}
                  onChange={(e) => setTempHref(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditDialog(false);
                    onEditingEnd?.();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!tempText.trim() || isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
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
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Background Image</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
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
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
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
            {uploadError && <p className="text-red-500 text-sm mt-1">{uploadError}</p>}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR paste a URL</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <img 
                src={url} 
                alt="Preview" 
                className="w-full h-32 object-cover rounded border border-gray-300"
                onError={(e) => { e.target.style.display = 'none'; }}
                onLoad={(e) => { e.target.style.display = ''; }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim() || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
  updateBlockContent,
  saveRef,
  isDragging,
  children 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showBackgroundImageDialog, setShowBackgroundImageDialog] = useState(false);
  const blockRef = useRef(null);

  const showActions = isHovered || isSelected;

  // Deselect when clicking outside this block
  useEffect(() => {
    if (!isSelected) return;
    const handleOutsideClick = (e) => {
      if (blockRef.current && !blockRef.current.contains(e.target)) {
        setIsSelected(false);
        setShowStylePanel(false);
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

  

  return (
    <div
      ref={blockRef}
      className={`relative group ${isDragging ? 'opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsSelected(true)}
    >

      {/* Inner block — block.style applied here so the outer wrapper always contains the toolbar */}
      <div className="relative" style={block.style || {}}>

      {/* Hover outline */}
      <div className={`absolute inset-0 border-2 border-blue-400 rounded pointer-events-none transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} ${isDragging ? 'border-blue-600' : ''}`} />
      
      {/* Block actions toolbar — visible on hover; stays visible while block is selected (clicked) */}
      <div
        className={`absolute -top-12 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50 transition-opacity ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={false} // Will be handled by parent
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => onDuplicate(index)}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowStylePanel(!showStylePanel)}
            className={`p-1.5 hover:bg-gray-100 rounded ${showStylePanel ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Block styles"
          >
            <Palette className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Block settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(index)}
            className="p-1.5 hover:bg-red-100 text-red-600 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      {/* Style panel — fixed centered modal so it's always in-viewport */}
      {showStylePanel && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowStylePanel(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[85vh] flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Block Styles</h4>
              <button onClick={() => setShowStylePanel(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {/* Background Image - Only for hero blocks */}
              {block.type === 'hero' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={block.content.backgroundImage || ''} 
                        onChange={(e) => updateBlockContent(index, { backgroundImage: e.target.value })} 
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" 
                        placeholder="Enter image URL..." 
                      />
                      <button
                        onClick={() => setShowBackgroundImageDialog(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Browse
                      </button>
                    </div>
                    {block.content.backgroundImage && (
                      <div className="mt-2">
                        <img 
                          src={resolveUrl(block.content.backgroundImage)} 
                          alt="Background preview" 
                          className="w-full h-20 object-cover rounded border border-gray-300"
                        />
                        <button
                          onClick={() => updateBlockContent(index, { backgroundImage: null })}
                          className="mt-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Remove background image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={block.style?.backgroundColor || '#ffffff'} 
                    onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })} 
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer" 
                  />
                  <input 
                    type="text" 
                    value={block.style?.backgroundColor || '#ffffff'} 
                    onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })} 
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" 
                    placeholder="#ffffff" 
                  />
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={block.style?.color || '#000000'} 
                    onChange={(e) => handleStyleUpdate({ color: e.target.value })} 
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer" 
                  />
                  <input 
                    type="text" 
                    value={block.style?.color || '#000000'} 
                    onChange={(e) => handleStyleUpdate({ color: e.target.value })} 
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" 
                    placeholder="#000000" 
                  />
                </div>
              </div>

              {/* Padding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Padding (px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Top</span>
                    <input type="number" value={block.style?.paddingTop ?? block.style?.padding ?? 40} onChange={(e) => handleStyleUpdate({ paddingTop: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Bottom</span>
                    <input type="number" value={block.style?.paddingBottom ?? block.style?.padding ?? 40} onChange={(e) => handleStyleUpdate({ paddingBottom: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                  </div>
                </div>
              </div>

              {/* Margin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Margin (px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Top</span>
                    <input type="number" value={block.style?.marginTop ?? block.style?.margin ?? 0} onChange={(e) => handleStyleUpdate({ marginTop: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Bottom</span>
                    <input type="number" value={block.style?.marginBottom ?? block.style?.margin ?? 0} onChange={(e) => handleStyleUpdate({ marginBottom: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                  </div>
                </div>
              </div>

              {/* Border */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Border</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Width</span>
                    <input type="number" value={block.style?.borderWidth || 0} onChange={(e) => { const w = parseInt(e.target.value) || 0; handleStyleUpdate({ borderWidth: w, borderStyle: w > 0 ? 'solid' : 'none', borderColor: block.style?.borderColor || '#e5e7eb' }); }} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Color</span>
                    <input type="color" value={block.style?.borderColor || '#e5e7eb'} onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })} className="w-full h-8 border border-gray-300 rounded cursor-pointer" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Radius</span>
                    <select value={block.style?.borderRadius || 0} onChange={(e) => handleStyleUpdate({ borderRadius: parseInt(e.target.value) })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded">
                      <option value="0">Square</option>
                      <option value="4">Rounded</option>
                      <option value="8">More</option>
                      <option value="999">Full</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text Alignment</label>
                <div className="grid grid-cols-4 gap-1">
                  {['left', 'center', 'right', 'justify'].map(align => (
                    <button key={align} onClick={() => handleStyleUpdate({ textAlign: align })} className={`px-2 py-1.5 text-xs border rounded capitalize ${block.style?.textAlign === align ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50'}`}>
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Classes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom CSS Classes</label>
                <input type="text" value={block.style?.className || ''} onChange={(e) => handleStyleUpdate({ className: e.target.value })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" placeholder="custom-class another-class" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200">
              <button onClick={() => handleStyleUpdate({})} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block settings (gear) — fixed centered modal */}
      {showBlockMenu && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowBlockMenu(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-80" onMouseDown={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 capitalize">{block.type} Block Settings</h4>
              <button onClick={() => setShowBlockMenu(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Block ID (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Block ID</label>
                <input type="text" readOnly value={block.id || '—'} className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 select-all" />
              </div>

              {/* Block Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Block Type</label>
                <input type="text" readOnly value={block.type} className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500 capitalize" />
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Visible</label>
                <button
                  onClick={() => handleUpdate('hidden', !block.hidden)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${block.hidden ? 'bg-gray-300' : 'bg-blue-500'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${block.hidden ? 'left-1' : 'left-5'}`} />
                </button>
              </div>

              {/* Anchor / ID for linking */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anchor (for #links)</label>
                <input
                  type="text"
                  value={block.anchor || ''}
                  onChange={(e) => handleUpdate('anchor', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="e.g. about-section"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowBlockMenu(false)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
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
          updateBlockContent(index, { backgroundImage: url });
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

      {/* Add block below button */}
      {showActions && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => {}} // Will be handled by parent
            className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600 shadow-lg flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Block
          </button>
        </div>
      )}
    </div>
  );
};

export default function InlineEditor() {
  const { slug: routeSlug } = useParams();
  const pageSlug = routeSlug || 'home';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [header, setHeader] = useState({ logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
  const [footer, setFooter] = useState({ sections: [], copyright: '', styles: {} });
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showBlockPalette, setShowBlockPalette] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
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
      onEditingEnd={(e) => { setIsEditing(false); props.onEditingEnd?.(e); }}
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
      const { data } = await api.get(`/web/${pageSlug}`);
      setPageData(data);
      setBlocks(data.blocks || []);
      setHeader(data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
      setFooter(data.footer || { sections: [], copyright: '', styles: {} });
      
      // Initialize history
      const initialState = {
        blocks: data.blocks || [],
        header: data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} },
        footer: data.footer || { sections: [], copyright: '', styles: {} },
      };
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
        blocks: blocks.map((b, i) => ({ ...b, order: i }))
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
          setBlocks(previousState.blocks);
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
          setBlocks(nextState.blocks);
          setHeader(nextState.header);
          setFooter(nextState.footer);
          setHistoryIndex(historyIndex + 1);
          setLastChangeTime(Date.now());
        }
      }

      // Escape: Close modals/dropdowns
      if (e.key === 'Escape') {
        setShowBlockPalette(false);
        setAddBlockIndex(null);
      }

      // Ctrl/Cmd + P: Preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank');
      }

      // + or A: Add block
      if (e.key === '+' || (e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setAddBlockIndex(blocks.length);
        setShowBlockPalette(true);
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.shiftKey) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex, blocks]);

  // Auto-save with debounce - only when user is not actively editing and changes have been made
  useEffect(() => {
    if (isEditing || historyIndex < 0 || lastChangeTime === 0) return;

    const timer = setTimeout(() => {
      saveRef.current();
    }, 3000);
    return () => clearTimeout(timer);
  }, [isEditing, historyIndex, lastChangeTime]);

  const saveToHistory = (newBlocks, newHeader, newFooter) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ blocks: newBlocks, header: newHeader, footer: newFooter });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setLastChangeTime(Date.now());
  };

  const updateBlock = (index, updates) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...updates };
    setBlocks(updated);
    saveToHistory(updated, header, footer);
  };

  const updateBlockContent = (index, contentUpdates) => {
    const updated = [...blocks];
    updated[index].content = { ...updated[index].content, ...contentUpdates };
    setBlocks(updated);
    saveToHistory(updated, header, footer);
  };

  const addBlock = (type, index = null) => {
    let content = {};
    if (type === 'hero') content = { title: 'New Hero Title', subtitle: 'New Hero Subtitle' };
    if (type === 'text') content = { content: 'New text content block' };
    if (type === 'intro') content = { title: 'The Introduction', content: 'So in case you were wondering what this is all about...', buttonText: 'Proceed', buttonLink: '#' };
    if (type === 'features') content = { title: 'The Details', subtitle: 'Feature details here', items: [] };
    if (type === 'highlights') content = { title: 'The Endorsements', items: [] };
    if (type === 'gallery') content = { title: 'Image Gallery', images: [] };
    if (type === 'testimonials') content = { title: 'What People Say', testimonials: [] };
    if (type === 'contact') content = { title: 'Get In Touch', subtitle: 'Send us a message', email: 'contact@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345' };
    if (type === 'video') content = { title: 'Featured Video', videoUrl: '', description: '' };
    if (type === 'grid') content = { columns: 3, gap: 24, items: [{ width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }] };

    const newBlock = { type, content };
    const newBlocks = index !== null ? [...blocks.slice(0, index), newBlock, ...blocks.slice(index)] : [...blocks, newBlock];
    setBlocks(newBlocks);
    saveToHistory(newBlocks, header, footer);
    setShowBlockPalette(false);
    setAddBlockIndex(null);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    saveToHistory(newBlocks, header, footer);
  };

  const moveBlock = (fromIndex, toIndex) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    setBlocks(newBlocks);
    saveToHistory(newBlocks, header, footer);
  };

  const duplicateBlock = (index) => {
    const block = blocks[index];
    const newBlock = { ...block, content: JSON.parse(JSON.stringify(block.content)) };
    const newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
    setBlocks(newBlocks);
    saveToHistory(newBlocks, header, footer);
  };

  const addNestedBlock = (parentIndex, colIndex, type) => {
    const block = blocks[parentIndex];
    const items = [...(block.content.items || [])];
    const column = items[colIndex] || { width: '33.33%', blocks: [] };
    
    let content = {};
    if (type === 'hero') content = { title: 'Hero Title', subtitle: 'Hero Subtitle' };
    if (type === 'text') content = { content: 'Text block' };
    if (type === 'intro') content = { title: 'Intro', content: 'Intro content', buttonText: 'Learn More', buttonLink: '#' };
    if (type === 'features') content = { title: 'Features', subtitle: 'Subtitle', items: [] };
    if (type === 'highlights') content = { title: 'Highlights', items: [] };
    if (type === 'gallery') content = { title: 'Gallery', images: [] };
    if (type === 'testimonials') content = { title: 'Testimonials', testimonials: [] };
    if (type === 'contact') content = { title: 'Contact', subtitle: 'Get in touch', email: '', phone: '', address: '' };
    if (type === 'video') content = { title: 'Video', videoUrl: '', description: '' };
    
    column.blocks = [...column.blocks, { type, content }];
    items[colIndex] = column;
    updateBlockContent(parentIndex, { items });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    moveBlock(result.source.index, result.destination.index);
  };

  // Custom renderer for editable blocks
  const renderEditableBlock = (block, index) => {
    const blockComponents = {
      hero: () => (
        <HeroBlock
          block={block}
          index={index}
          updateBlockContent={updateBlockContent}
          updateBlock={updateBlock}
          EditableText={EditableText}
        />
      ),
      text: () => (
        <div className="py-12 px-6 max-w-3xl mx-auto">
          <EditableText
            content={block.content.content}
            onChange={(value) => updateBlockContent(index, { content: value })}
            placeholder="Text content (markdown supported)"
            className="text-lg text-slate-700 leading-relaxed block"
            tag="div"
            multiline
          />
        </div>
      ),
      intro: () => (
        <div className="py-20 px-6 text-center bg-gray-50">
          <EditableText
            content={block.content.title}
            onChange={(value) => updateBlockContent(index, { title: value })}
            placeholder="Introduction Title"
            className="text-4xl font-bold mb-6 block"
            tag="h2"
          />
          <EditableText
            content={block.content.content}
            onChange={(value) => updateBlockContent(index, { content: value })}
            placeholder="Introduction content"
            className="text-xl max-w-3xl mx-auto font-light leading-relaxed mb-8 block"
            tag="p"
            multiline
          />
          <EditableButton
            text={block.content.buttonText}
            href={block.content.buttonLink}
            onChange={({ text, href }) => updateBlockContent(index, { buttonText: text, buttonLink: href })}
            placeholder="Button Text"
            className="inline-block bg-blue-600 text-white font-bold px-8 py-4 rounded hover:bg-blue-700 transition"
          />
        </div>
      ),
      features: () => (
        <div className="py-20 px-6 max-w-6xl mx-auto text-center">
          <EditableText
            content={block.content.title}
            onChange={(value) => updateBlockContent(index, { title: value })}
            placeholder="Features Title"
            className="text-3xl font-bold text-gray-800 mb-2 block"
            tag="h2"
          />
          <EditableText
            content={block.content.subtitle}
            onChange={(value) => updateBlockContent(index, { subtitle: value })}
            placeholder="Features Subtitle"
            className="text-xl text-gray-500 font-light mb-12 block"
            tag="p"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(block.content.items || []).map((item, i) => (
              <div key={i} className="text-center p-6 border border-gray-200 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{item.icon || '⭐'}</span>
                </div>
                <EditableText
                  content={item.title}
                  onChange={(value) => {
                    const items = [...(block.content.items || [])];
                    items[i] = { ...items[i], title: value };
                    updateBlockContent(index, { items });
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
                    updateBlockContent(index, { items });
                  }}
                  placeholder="Feature Description"
                  className="text-gray-600 block"
                  tag="p"
                  multiline
                />
              </div>
            ))}
          </div>
        </div>
      ),
      highlights: () => (
        <div className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto text-center">
            <EditableText
              content={block.content.title}
              onChange={(value) => updateBlockContent(index, { title: value })}
              placeholder="Highlights Title"
              className="text-3xl font-bold text-gray-800 mb-12 block"
              tag="h2"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(block.content.items || []).map((item, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <EditableImage
                    src={item.imageUrl}
                    alt={item.title}
                    onChange={(url) => {
                      const items = [...(block.content.items || [])];
                      items[i] = { ...items[i], imageUrl: url };
                      updateBlockContent(index, { items });
                    }}
                    onRemove={() => {
                      const items = [...(block.content.items || [])];
                      items[i] = { ...items[i], imageUrl: '' };
                      updateBlockContent(index, { items });
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
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Highlight Title"
                      className="text-xl font-semibold text-gray-900 mb-2 block"
                      tag="h3"
                    />
                    <EditableText
                      content={item.description}
                      onChange={(value) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], description: value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Highlight Description"
                      className="text-gray-600 block"
                      tag="p"
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
              onChange={(value) => updateBlockContent(index, { title: value })}
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
                      updateBlockContent(index, { images });
                    }}
                    onRemove={() => {
                      const images = (block.content.images || []).filter((_, idx) => idx !== i);
                      updateBlockContent(index, { images });
                    }}
                    className="w-full h-64 object-cover rounded-lg"
                    placeholder="Click to add image"
                  />
                  {image.caption && (
                    <div className="mt-2 text-center">
                      <EditableText
                        content={image.caption}
                        onChange={(value) => {
                          const images = [...(block.content.images || [])];
                          images[i] = { ...images[i], caption: value };
                          updateBlockContent(index, { images });
                        }}
                        placeholder="Image Caption"
                        className="text-sm text-gray-600 block"
                        tag="p"
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
        <div className="py-20 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <EditableText
              content={block.content.title}
              onChange={(value) => updateBlockContent(index, { title: value })}
              placeholder="Testimonials Title"
              className="text-3xl font-bold text-gray-800 mb-12 text-center block"
              tag="h2"
            />
            <div className="space-y-8">
              {(block.content.testimonials || []).map((testimonial, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <EditableText
                    content={testimonial.quote}
                    onChange={(value) => {
                      const testimonials = [...(block.content.testimonials || [])];
                      testimonials[i] = { ...testimonials[i], quote: value };
                      updateBlockContent(index, { testimonials });
                    }}
                    placeholder="Customer testimonial quote"
                    className="text-xl text-gray-700 italic mb-6 block"
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
                          updateBlockContent(index, { testimonials });
                        }}
                        placeholder="Author Name"
                        className="font-semibold text-gray-900 block"
                        tag="div"
                      />
                      <EditableText
                        content={testimonial.role}
                        onChange={(value) => {
                          const testimonials = [...(block.content.testimonials || [])];
                          testimonials[i] = { ...testimonials[i], role: value };
                          updateBlockContent(index, { testimonials });
                        }}
                        placeholder="Author Role"
                        className="text-gray-600 block"
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
              onChange={(value) => updateBlockContent(index, { title: value })}
              placeholder="Contact Title"
              className="text-3xl font-bold text-gray-800 mb-2 block"
              tag="h2"
            />
            <EditableText
              content={block.content.subtitle}
              onChange={(value) => updateBlockContent(index, { subtitle: value })}
              placeholder="Contact Subtitle"
              className="text-xl text-gray-600 mb-12 block"
              tag="p"
            />
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <EditableText
                    content={block.content.email}
                    onChange={(value) => updateBlockContent(index, { email: value })}
                    placeholder="contact@example.com"
                    className="text-lg text-blue-600 block"
                    tag="a"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <EditableText
                    content={block.content.phone}
                    onChange={(value) => updateBlockContent(index, { phone: value })}
                    placeholder="+1 (555) 123-4567"
                    className="text-lg text-gray-900 block"
                    tag="div"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <EditableText
                    content={block.content.address}
                    onChange={(value) => updateBlockContent(index, { address: value })}
                    placeholder="123 Main St, City, State 12345"
                    className="text-lg text-gray-900 block"
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
              onChange={(value) => updateBlockContent(index, { title: value })}
              placeholder="Video Title"
              className="text-3xl font-bold text-gray-800 mb-8 block"
              tag="h2"
            />
            {block.content.videoUrl ? (
              <div className="aspect-w-16 aspect-h-9 mb-8">
                <iframe
                  src={block.content.videoUrl}
                  className="w-full h-96 rounded-lg"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-12 mb-8">
                <div className="text-gray-500">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎥</span>
                  </div>
                  <p>Click to add video URL</p>
                </div>
              </div>
            )}
            <EditableText
              content={block.content.description}
              onChange={(value) => updateBlockContent(index, { description: value })}
              placeholder="Video description"
              className="text-lg text-gray-600 block"
              tag="p"
              multiline
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
              <input
                type="url"
                value={block.content.videoUrl || ''}
                onChange={(e) => updateBlockContent(index, { videoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div key={colIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-4">Column {colIndex + 1}</div>
                  <div className="space-y-4">
                    {(column.blocks || []).map((nestedBlock, blockIndex) => (
                      <div key={blockIndex} className="p-4 bg-gray-50 rounded border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2">{nestedBlock.type}</div>
                        <div className="text-xs text-gray-500">
                          {Object.entries(nestedBlock.content).map(([key, value]) => (
                            <div key={key}>{key}: {typeof value === 'string' ? value.substring(0, 30) + '...' : JSON.stringify(value).substring(0, 30) + '...'}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addNestedBlock(index, colIndex, 'text')}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-blue-600 hover:bg-blue-50 text-sm"
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
        <div className="p-8 border-2 border-dashed border-gray-300 rounded text-center">
          <p className="text-gray-500">Unknown block type: {block.type}</p>
        </div>
      );
    }

    return <BlockComponent />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const deviceClasses = {
    desktop: 'w-full',
    tablet: 'max-w-2xl mx-auto border-x border-gray-300',
    mobile: 'max-w-md mx-auto border-x border-gray-300'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Website Editor</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Device preview */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-white shadow-sm' : ''}`}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`p-2 rounded ${previewDevice === 'tablet' ? 'bg-white shadow-sm' : ''}`}
                title="Tablet"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-white shadow-sm' : ''}`}
                title="Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Save status */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <AlertCircle className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Saved
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <X className="w-4 h-4" />
                  Error
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                title="Keyboard shortcuts (?)"
              >
                <Type className="w-4 h-4" />
                Shortcuts
              </button>
              <button
                onClick={() => window.open(pageSlug === 'home' ? '/' : `/${pageSlug}`, '_blank')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => saveRef.current()}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main editor area — full width, no sidebar */}
      <div className="flex">
        <div className="flex-1">
          <div className={`${deviceClasses[previewDevice]} bg-white min-h-screen`}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="blocks">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {blocks.map((block, index) => (
                      <Draggable key={index} draggableId={`block-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="mb-4"
                          >
                            <EditableBlock
                              block={block}
                              index={index}
                              onUpdate={updateBlock}
                              onDelete={deleteBlock}
                              onMoveUp={(i) => i > 0 && moveBlock(i, i - 1)}
                              onMoveDown={(i) => i < blocks.length - 1 && moveBlock(i, i + 1)}
                              onDuplicate={duplicateBlock}
                              updateBlockContent={updateBlockContent}
                              saveRef={saveRef}
                              isDragging={snapshot.isDragging}
                            >
                              {/* Drag handle */}
                              <div {...provided.dragHandleProps} className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                              
                              {/* Block content */}
                              {renderEditableBlock(block, index)}
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

            {/* Add block at bottom */}
            <div className="p-8 text-center border-t border-gray-200">
              <button
                onClick={() => {
                  setAddBlockIndex(blocks.length);
                  setShowBlockPalette(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Block
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Block palette modal */}
      {showBlockPalette && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add Block</h3>
                <button
                  onClick={() => {
                    setShowBlockPalette(false);
                    setAddBlockIndex(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {BLOCK_TYPES.map(({ id, name, Icon, description }) => (
                  <button
                    key={id}
                    onClick={() => addBlock(id, addBlockIndex)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="text-sm text-gray-500">{description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Save</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">Ctrl/Cmd + S</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Undo</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">Ctrl/Cmd + Z</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Redo</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">Ctrl/Cmd + Shift + Z</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Preview</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">Ctrl/Cmd + P</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Add Block</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">+</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Close Dialog</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">Esc</kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Show Help</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">?</kbd>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Click any text to edit it inline</li>
                    <li>• Hover over blocks to see action buttons</li>
                    <li>• Drag blocks to reorder them</li>
                    <li>• Use the style panel (palette icon) to customize block appearance</li>
                    <li>• All changes are auto-saved</li>
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