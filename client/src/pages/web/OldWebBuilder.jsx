// This is the original web builder code - kept as backup
// To use this instead of InlineEditor, update the import in index.jsx

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Settings, LayoutTemplate, Plus, Trash2, GripVertical, Image as ImageIcon, Eye, EyeOff, Monitor, Smartphone, Tablet, Palette, Type, Eye as PreviewIcon, Undo, Redo } from 'lucide-react';
import { marked } from 'marked';
import api from '../../utils/api';
import PublicHome from '../public/Home';
import { useToast } from '../../components/Toast';

const TEMPLATES = [
  { id: 'escape-velocity', name: 'Escape Velocity', description: 'HTML5 UP styled theme with distinct sections' },
  { id: 'modern', name: 'Modern', description: 'Clean, spacious, and modern design' },
  { id: 'classic', name: 'Classic', description: 'Traditional business layout' },
  { id: 'minimal', name: 'Minimal', description: 'Focus on content with minimal distractions' },
];

export default function OldWebBuilder() {
  const { toast, ToastMount } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' | 'header' | 'footer'

  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [blocks, setBlocks] = useState([]);
  const [header, setHeader] = useState({ logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
  const [footer, setFooter] = useState({ sections: [], copyright: '', styles: {} });
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop', 'tablet', 'mobile'
  const [stylePanelBlock, setStylePanelBlock] = useState(null); // Index of block with open style panel
  const [markdownPreviewBlocks, setMarkdownPreviewBlocks] = useState({}); // Track which text blocks show markdown preview
  const [history, setHistory] = useState([]); // History stack for undo
  const [historyIndex, setHistoryIndex] = useState(-1); // Current position in history

  useEffect(() => {
    fetchPage();
  }, []);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/web/home');
      setPageData(data);
      setSelectedTemplate(data.template || 'modern');
      setBlocks(data.blocks || []);
      setHeader(data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} });
      setFooter(data.footer || { sections: [], copyright: '', styles: {} });
      // Save initial state to history
      setHistory([{
        template: data.template || 'modern',
        blocks: data.blocks || [],
        header: data.header || { logo: { text: '', imageUrl: '' }, navigation: [], styles: {} },
        footer: data.footer || { sections: [], copyright: '', styles: {} },
      }]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('Failed to fetch page data:', error);
      toast('Failed to load page data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (newTemplate, newBlocks, newHeader, newFooter) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      template: newTemplate,
      blocks: newBlocks,
      header: newHeader,
      footer: newFooter,
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setSelectedTemplate(previousState.template);
      setBlocks(previousState.blocks);
      setHeader(previousState.header);
      setFooter(previousState.footer);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSelectedTemplate(nextState.template);
      setBlocks(nextState.blocks);
      setHeader(nextState.header);
      setFooter(nextState.footer);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data } = await api.put('/web/home', {
        template: selectedTemplate,
        header,
        footer,
        blocks: blocks.map((b, i) => ({ ...b, order: i }))
      });
      setPageData(data);
      toast('Page saved successfully!');
    } catch (error) {
      console.error('Failed to save page:', error);
      toast('Failed to save page.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type) => {
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

    const newBlocks = [...blocks, { type, content }];
    setBlocks(newBlocks);
    saveToHistory(selectedTemplate, newBlocks, header, footer);
  };

  const updateBlockContent = (index, newContent) => {
    const updated = [...blocks];
    updated[index].content = { ...updated[index].content, ...newContent };
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated, header, footer);
  };

  const updateGridColumn = (index, colIndex, updates) => {
    const block = blocks[index];
    const items = [...(block.content.items || [])];
    items[colIndex] = { ...items[colIndex], ...updates };
    updateBlockContent(index, { items });
  };

  const addNestedBlock = (index, colIndex, type) => {
    const block = blocks[index];
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
    updateBlockContent(index, { items });
  };

  const removeNestedBlock = (index, colIndex, blockIndex) => {
    const block = blocks[index];
    const items = [...(block.content.items || [])];
    const column = items[colIndex] || { width: '33.33%', blocks: [] };
    column.blocks = column.blocks.filter((_, i) => i !== blockIndex);
    items[colIndex] = column;
    updateBlockContent(index, { items });
  };

  const updateNestedBlockContent = (index, colIndex, blockIndex, newContent) => {
    const block = blocks[index];
    const items = [...(block.content.items || [])];
    const column = items[colIndex] || { width: '33.33%', blocks: [] };
    column.blocks = column.blocks.map((b, i) => i === blockIndex ? { ...b, content: { ...b.content, ...newContent } } : b);
    items[colIndex] = column;
    updateBlockContent(index, { items });
  };

  const setGridColumns = (index, count) => {
    const block = blocks[index];
    const width = count > 0 ? `${(100 / count).toFixed(2)}%` : '100%';
    const items = Array.from({ length: count }, () => ({ width, blocks: [] }));
    updateBlockContent(index, { columns: count, items });
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    saveToHistory(selectedTemplate, newBlocks, header, footer);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
    saveToHistory(selectedTemplate, items, header, footer);
  };

  const updateBlockStyle = (index, newStyle) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], style: { ...updated[index].style, ...newStyle } };
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated, header, footer);
  };

  // Render block controls based on type
  const renderBlockControls = (block, index) => {
    switch (block.type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <textarea
                value={block.content.subtitle || ''}
                onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        );
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content (Markdown supported)</label>
            <div className="space-y-2">
              <textarea
                value={block.content.content || ''}
                onChange={(e) => updateBlockContent(index, { content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
              />
              <button
                onClick={() => setMarkdownPreviewBlocks({ ...markdownPreviewBlocks, [index]: !markdownPreviewBlocks[index] })}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {markdownPreviewBlocks[index] ? 'Edit' : 'Preview'} Markdown
              </button>
              {markdownPreviewBlocks[index] && (
                <div className="p-4 border border-gray-200 rounded-md bg-gray-50 prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: marked(block.content.content || '') }} />
                </div>
              )}
            </div>
          </div>
        );
      case 'intro':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={block.content.content || ''}
                onChange={(e) => updateBlockContent(index, { content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                value={block.content.buttonText || ''}
                onChange={(e) => updateBlockContent(index, { buttonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
              <input
                type="text"
                value={block.content.buttonLink || ''}
                onChange={(e) => updateBlockContent(index, { buttonLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );
      case 'features':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={block.content.subtitle || ''}
                onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
              <div className="space-y-2">
                {(block.content.items || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={item.icon || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], icon: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Icon (e.g., lucide-star)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], title: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Title"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], description: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Description"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const items = (block.content.items || []).filter((_, idx) => idx !== i);
                        updateBlockContent(index, { items });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const items = [...(block.content.items || []), { icon: '', title: '', description: '' }];
                    updateBlockContent(index, { items });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Feature
                </button>
              </div>
            </div>
          </div>
        );
      case 'highlights':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Highlights</label>
              <div className="space-y-2">
                {(block.content.items || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], title: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Title"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], description: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Description"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={item.imageUrl || ''}
                      onChange={(e) => {
                        const items = [...(block.content.items || [])];
                        items[i] = { ...items[i], imageUrl: e.target.value };
                        updateBlockContent(index, { items });
                      }}
                      placeholder="Image URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const items = (block.content.items || []).filter((_, idx) => idx !== i);
                        updateBlockContent(index, { items });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const items = [...(block.content.items || []), { title: '', description: '', imageUrl: '' }];
                    updateBlockContent(index, { items });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Highlight
                </button>
              </div>
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
              <div className="space-y-2">
                {(block.content.images || []).map((image, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={image.url || ''}
                      onChange={(e) => {
                        const images = [...(block.content.images || [])];
                        images[i] = { ...images[i], url: e.target.value };
                        updateBlockContent(index, { images });
                      }}
                      placeholder="Image URL"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={image.caption || ''}
                      onChange={(e) => {
                        const images = [...(block.content.images || [])];
                        images[i] = { ...images[i], caption: e.target.value };
                        updateBlockContent(index, { images });
                      }}
                      placeholder="Caption"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const images = (block.content.images || []).filter((_, idx) => idx !== i);
                        updateBlockContent(index, { images });
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const images = [...(block.content.images || []), { url: '', caption: '' }];
                    updateBlockContent(index, { images });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Image
                </button>
              </div>
            </div>
          </div>
        );
      case 'testimonials':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Testimonials</label>
              <div className="space-y-2">
                {(block.content.testimonials || []).map((testimonial, i) => (
                  <div key={i} className="space-y-2">
                    <textarea
                      value={testimonial.quote || ''}
                      onChange={(e) => {
                        const testimonials = [...(block.content.testimonials || [])];
                        testimonials[i] = { ...testimonials[i], quote: e.target.value };
                        updateBlockContent(index, { testimonials });
                      }}
                      placeholder="Quote"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testimonial.author || ''}
                        onChange={(e) => {
                          const testimonials = [...(block.content.testimonials || [])];
                          testimonials[i] = { ...testimonials[i], author: e.target.value };
                          updateBlockContent(index, { testimonials });
                        }}
                        placeholder="Author"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={testimonial.role || ''}
                        onChange={(e) => {
                          const testimonials = [...(block.content.testimonials || [])];
                          testimonials[i] = { ...testimonials[i], role: e.target.value };
                          updateBlockContent(index, { testimonials });
                        }}
                        placeholder="Role"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const testimonials = (block.content.testimonials || []).filter((_, idx) => idx !== i);
                          updateBlockContent(index, { testimonials });
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const testimonials = [...(block.content.testimonials || []), { quote: '', author: '', role: '' }];
                    updateBlockContent(index, { testimonials });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Testimonial
                </button>
              </div>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
              <input
                type="text"
                value={block.content.subtitle || ''}
                onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={block.content.email || ''}
                onChange={(e) => updateBlockContent(index, { email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={block.content.phone || ''}
                onChange={(e) => updateBlockContent(index, { phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={block.content.address || ''}
                onChange={(e) => updateBlockContent(index, { address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={block.content.title || ''}
                onChange={(e) => updateBlockContent(index, { title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
              <input
                type="url"
                value={block.content.videoUrl || ''}
                onChange={(e) => updateBlockContent(index, { videoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={block.content.description || ''}
                onChange={(e) => updateBlockContent(index, { description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
          </div>
        );
      case 'grid':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(cols => (
                  <button
                    key={cols}
                    onClick={() => setGridColumns(index, cols)}
                    className={`px-3 py-2 rounded-md ${block.content.columns === cols ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {cols}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gap (px)</label>
              <input
                type="number"
                value={block.content.gap || 24}
                onChange={(e) => updateBlockContent(index, { gap: parseInt(e.target.value) || 24 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Columns Layout</label>
              <div className="space-y-2">
                {(block.content.items || []).map((column, colIndex) => (
                  <div key={colIndex} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Column {colIndex + 1}</span>
                      <input
                        type="text"
                        value={column.width || '33.33%'}
                        onChange={(e) => updateGridColumn(index, colIndex, { width: e.target.value })}
                        placeholder="Width (e.g., 33.33%, 250px, flex-1)"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      {(column.blocks || []).map((nestedBlock, blockIndex) => (
                        <div key={blockIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">{nestedBlock.type}</span>
                          <button
                            onClick={() => removeNestedBlock(index, colIndex, blockIndex)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addNestedBlock(index, colIndex, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Add block...</option>
                        <option value="hero">Hero</option>
                        <option value="text">Text</option>
                        <option value="intro">Intro</option>
                        <option value="features">Features</option>
                        <option value="highlights">Highlights</option>
                        <option value="gallery">Gallery</option>
                        <option value="testimonials">Testimonials</option>
                        <option value="contact">Contact</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return <div className="text-gray-500">Unknown block type: {block.type}</div>;
    }
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

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-gray-900">Preview</h1>
            <div className="flex items-center gap-4">
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
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Editor
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-center p-8">
          <div className={`bg-white shadow-lg ${
            previewDevice === 'desktop' ? 'w-full' :
            previewDevice === 'tablet' ? 'max-w-2xl' :
            'max-w-md'
          }`}>
            <PublicHome previewData={{ ...pageData, template: selectedTemplate, blocks, header, footer }} previewMode={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Website Builder</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar - Page settings and blocks */}
          <div className="lg:col-span-1 space-y-6">
            {/* Page Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Page Settings</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        saveToHistory(e.target.value, blocks, header, footer);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Block */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Add Block</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addBlock('hero')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Hero</div>
                    <div className="text-sm text-gray-500">Title & subtitle</div>
                  </button>
                  <button
                    onClick={() => addBlock('text')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Text</div>
                    <div className="text-sm text-gray-500">Rich text content</div>
                  </button>
                  <button
                    onClick={() => addBlock('intro')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Intro</div>
                    <div className="text-sm text-gray-500">Intro with button</div>
                  </button>
                  <button
                    onClick={() => addBlock('features')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Features</div>
                    <div className="text-sm text-gray-500">Feature grid</div>
                  </button>
                  <button
                    onClick={() => addBlock('highlights')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Highlights</div>
                    <div className="text-sm text-gray-500">Highlight cards</div>
                  </button>
                  <button
                    onClick={() => addBlock('gallery')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Gallery</div>
                    <div className="text-sm text-gray-500">Image gallery</div>
                  </button>
                  <button
                    onClick={() => addBlock('testimonials')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Testimonials</div>
                    <div className="text-sm text-gray-500">Customer quotes</div>
                  </button>
                  <button
                    onClick={() => addBlock('contact')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Contact</div>
                    <div className="text-sm text-gray-500">Contact info</div>
                  </button>
                  <button
                    onClick={() => addBlock('video')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Video</div>
                    <div className="text-sm text-gray-500">Video section</div>
                  </button>
                  <button
                    onClick={() => addBlock('grid')}
                    className="p-3 border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 text-left"
                  >
                    <div className="font-medium text-gray-900">Grid</div>
                    <div className="text-sm text-gray-500">Multi-column</div>
                  </button>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">History</h2>
              </div>
              <div className="p-6">
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Undo className="w-4 h-4" />
                    Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Redo className="w-4 h-4" />
                    Redo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main content - Blocks list */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Page Blocks</h2>
              </div>
              <div className="p-6">
                {blocks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No blocks yet. Add your first block to get started.</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="blocks">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {blocks.map((block, index) => (
                            <Draggable key={index} draggableId={`block-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`border border-gray-200 rounded-lg ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                >
                                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-5 h-5 text-gray-400" />
                                      </div>
                                      <span className="font-medium text-gray-900 capitalize">{block.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setStylePanelBlock(stylePanelBlock === index ? null : index)}
                                        className={`p-2 rounded ${stylePanelBlock === index ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                        title="Style"
                                      >
                                        <Palette className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteBlock(index)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="p-6">
                                    {renderBlockControls(block, index)}
                                  </div>
                                  {stylePanelBlock === index && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                      <h4 className="font-medium text-gray-900 mb-4">Block Styles</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                                          <input
                                            type="color"
                                            value={block.style?.backgroundColor || '#ffffff'}
                                            onChange={(e) => updateBlockStyle(index, { backgroundColor: e.target.value })}
                                            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                                          <input
                                            type="color"
                                            value={block.style?.textColor || '#000000'}
                                            onChange={(e) => updateBlockStyle(index, { textColor: e.target.value })}
                                            className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Padding (px)</label>
                                          <input
                                            type="number"
                                            value={block.style?.padding || 40}
                                            onChange={(e) => updateBlockStyle(index, { padding: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Margin (px)</label>
                                          <input
                                            type="number"
                                            value={block.style?.margin || 0}
                                            onChange={(e) => updateBlockStyle(index, { margin: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom CSS Classes</label>
                                        <input
                                          type="text"
                                          value={block.style?.customClasses || ''}
                                          onChange={(e) => updateBlockStyle(index, { customClasses: e.target.value })}
                                          placeholder="e.g., custom-class another-class"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  )}
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
              </div>
            </div>
          </div>
        </div>
      </div>
      {ToastMount}
    </div>
  );
}