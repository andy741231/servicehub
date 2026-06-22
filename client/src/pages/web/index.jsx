import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Settings, LayoutTemplate, Plus, Trash2, GripVertical, Image as ImageIcon, Eye, EyeOff, Monitor, Smartphone, Tablet, Palette, Type, Eye as PreviewIcon, Undo, Redo } from 'lucide-react';
import { marked } from 'marked';
import api from '../../utils/api';
import PublicHome from '../public/Home';

const TEMPLATES = [
  { id: 'escape-velocity', name: 'Escape Velocity', description: 'HTML5 UP styled theme with distinct sections' },
  { id: 'modern', name: 'Modern', description: 'Clean, spacious, and modern design' },
  { id: 'classic', name: 'Classic', description: 'Traditional business layout' },
  { id: 'minimal', name: 'Minimal', description: 'Focus on content with minimal distractions' },
];

export default function WebIndex() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageData, setPageData] = useState(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [blocks, setBlocks] = useState([]);
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
      // Save initial state to history
      setHistory([{ template: data.template || 'modern', blocks: data.blocks || [] }]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('Failed to fetch page data:', error);
      alert('Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (newTemplate, newBlocks) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ template: newTemplate, blocks: newBlocks });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setSelectedTemplate(previousState.template);
      setBlocks(previousState.blocks);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setSelectedTemplate(nextState.template);
      setBlocks(nextState.blocks);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data } = await api.put('/web/home', {
        template: selectedTemplate,
        blocks: blocks.map((b, i) => ({ ...b, order: i }))
      });
      setPageData(data);
      alert('Page saved successfully!');
    } catch (error) {
      console.error('Failed to save page:', error);
      alert('Failed to save page');
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

    const newBlocks = [...blocks, { type, content }];
    setBlocks(newBlocks);
    saveToHistory(selectedTemplate, newBlocks);
  };

  const updateBlockContent = (index, newContent) => {
    const updated = [...blocks];
    updated[index].content = { ...updated[index].content, ...newContent };
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated);
  };

  const removeBlock = (index) => {
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated);
  };

  const moveBlock = (index, direction) => {
    if (index === 0 && direction === -1) return;
    if (index === blocks.length - 1 && direction === 1) return;
    
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[index + direction];
    updated[index + direction] = temp;
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setBlocks(items);
    saveToHistory(selectedTemplate, items);
  };

  // Helper for array items in blocks
  const handleItemChange = (blockIndex, itemsKey, itemIndex, field, value) => {
    const blockContent = blocks[blockIndex].content;
    const items = [...(blockContent[itemsKey] || [])];
    items[itemIndex] = { ...items[itemIndex], [field]: value };
    updateBlockContent(blockIndex, { [itemsKey]: items });
  };

  const addItem = (blockIndex, itemsKey, defaultItem) => {
    const blockContent = blocks[blockIndex].content;
    const items = [...(blockContent[itemsKey] || []), defaultItem];
    updateBlockContent(blockIndex, { [itemsKey]: items });
  };

  const removeItem = (blockIndex, itemsKey, itemIndex) => {
    const blockContent = blocks[blockIndex].content;
    const items = (blockContent[itemsKey] || []).filter((_, i) => i !== itemIndex);
    updateBlockContent(blockIndex, { [itemsKey]: items });
  };

  const updateBlockStyle = (index, styleKey, value) => {
    const updated = [...blocks];
    if (!updated[index].style) {
      updated[index].style = {};
    }
    updated[index].style[styleKey] = value;
    setBlocks(updated);
    saveToHistory(selectedTemplate, updated);
  };

  const getPreviewData = () => {
    return {
      title: pageData?.title || 'Website',
      template: selectedTemplate,
      blocks: blocks.map((b, i) => ({ ...b, order: i }))
    };
  };

  const getDeviceWidth = () => {
    switch (previewDevice) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
      default: return '100%';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading builder...</div>;

  return (
    <div className="max-w-full mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6 px-6">
        <h1 className="text-3xl font-bold text-gray-900">Web Builder</h1>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
            View Live Site ↗
          </a>
          
          {/* Preview Mode Toggle */}
          <div className="flex items-center gap-2 border-l pl-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                showPreview ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm font-medium">Preview</span>
            </button>
            
            {/* Device Selector - only shown when preview is active */}
            {showPreview && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                  title="Desktop"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-2 rounded ${previewDevice === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                  title="Tablet"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                  title="Mobile"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-l pl-4">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded ${historyIndex <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded ${historyIndex >= history.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex gap-6 px-6 ${showPreview ? '' : 'max-w-7xl mx-auto'}`}>
        {/* Editor Panel */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} space-y-6`}>
          {/* Template Selector */}
          <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4 border-b pb-4">
          <Settings className="w-5 h-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-800">Page Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => (
            <div 
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template.id);
                saveToHistory(template.id, blocks);
              }}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedTemplate === template.id 
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <LayoutTemplate className={`w-4 h-4 ${selectedTemplate === template.id ? 'text-blue-500' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
              </div>
              <p className="text-sm text-gray-500">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Block Editor */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-4 flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-gray-800">Page Blocks</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => addBlock('hero')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Hero
            </button>
            <button onClick={() => addBlock('intro')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Intro
            </button>
            <button onClick={() => addBlock('features')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Features
            </button>
            <button onClick={() => addBlock('highlights')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Highlights
            </button>
            <button onClick={() => addBlock('text')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Text
            </button>
            <button onClick={() => addBlock('gallery')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Gallery
            </button>
            <button onClick={() => addBlock('testimonials')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Testimonials
            </button>
            <button onClick={() => addBlock('contact')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Contact
            </button>
            <button onClick={() => addBlock('video')} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="w-4 h-4 mr-1" /> Video
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                {blocks.length === 0 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
                    No blocks yet. Add a block to get started.
                  </div>
                )}
                
                {blocks.map((block, index) => (
                  <Draggable key={index} draggableId={String(index)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                      >
                        <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            </div>
                            <span className="font-medium text-sm text-gray-700 uppercase tracking-wider">{block.type} BLOCK</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setStylePanelBlock(stylePanelBlock === index ? null : index)}
                              className={`p-1 rounded ${stylePanelBlock === index ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-200'}`}
                              title="Block Styles"
                            >
                              <Palette className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30">↑</button>
                            <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-1 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30">↓</button>
                            <button onClick={() => removeBlock(index)} className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {/* Style Panel */}
                        {stylePanelBlock === index && (
                          <div className="bg-purple-50 border-b border-purple-100 p-4">
                            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                              <Palette className="w-4 h-4" />
                              Block Styles
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-purple-700 mb-1">Background Color</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={block.style?.backgroundColor || '#ffffff'} 
                                    onChange={(e) => updateBlockStyle(index, 'backgroundColor', e.target.value)}
                                    className="w-10 h-8 rounded border cursor-pointer"
                                  />
                                  <input 
                                    type="text" 
                                    value={block.style?.backgroundColor || '#ffffff'} 
                                    onChange={(e) => updateBlockStyle(index, 'backgroundColor', e.target.value)}
                                    className="flex-1 text-sm border border-purple-200 rounded px-2 py-1"
                                    placeholder="#ffffff"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-purple-700 mb-1">Text Color</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="color" 
                                    value={block.style?.textColor || '#1f2937'} 
                                    onChange={(e) => updateBlockStyle(index, 'textColor', e.target.value)}
                                    className="w-10 h-8 rounded border cursor-pointer"
                                  />
                                  <input 
                                    type="text" 
                                    value={block.style?.textColor || '#1f2937'} 
                                    onChange={(e) => updateBlockStyle(index, 'textColor', e.target.value)}
                                    className="flex-1 text-sm border border-purple-200 rounded px-2 py-1"
                                    placeholder="#1f2937"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-purple-700 mb-1">Padding (px)</label>
                                <input 
                                  type="number" 
                                  value={block.style?.padding || ''} 
                                  onChange={(e) => updateBlockStyle(index, 'padding', e.target.value)}
                                  className="w-full text-sm border border-purple-200 rounded px-2 py-1"
                                  placeholder="20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-purple-700 mb-1">Margin (px)</label>
                                <input 
                                  type="number" 
                                  value={block.style?.margin || ''} 
                                  onChange={(e) => updateBlockStyle(index, 'margin', e.target.value)}
                                  className="w-full text-sm border border-purple-200 rounded px-2 py-1"
                                  placeholder="0"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-purple-700 mb-1">Custom CSS Classes</label>
                                <input 
                                  type="text" 
                                  value={block.style?.customClasses || ''} 
                                  onChange={(e) => updateBlockStyle(index, 'customClasses', e.target.value)}
                                  className="w-full text-sm border border-purple-200 rounded px-2 py-1"
                                  placeholder="custom-class-1 custom-class-2"
                                />
                              </div>
                            </div>
                          </div>
                        )}
              
              <div className="p-4 space-y-4">
                
                {block.type === 'hero' && (
                  <>
                    <div><label className="block text-sm text-gray-600 mb-1">Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="block text-sm text-gray-600 mb-1">Subtitle</label><input type="text" value={block.content.subtitle || ''} onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                  </>
                )}
                
                {block.type === 'intro' && (
                  <div className="space-y-3">
                    <div><label className="text-sm text-gray-600 mb-1 block">Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Content</label><textarea value={block.content.content || ''} onChange={(e) => updateBlockContent(index, { content: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" rows="3" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm text-gray-600 mb-1 block">Button Text</label><input type="text" value={block.content.buttonText || ''} onChange={(e) => updateBlockContent(index, { buttonText: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                      <div><label className="text-sm text-gray-600 mb-1 block">Button Link</label><input type="text" value={block.content.buttonLink || ''} onChange={(e) => updateBlockContent(index, { buttonLink: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    </div>
                  </div>
                )}

                {block.type === 'features' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-sm text-gray-600 mb-1 block">Section Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                      <div><label className="text-sm text-gray-600 mb-1 block">Section Subtitle</label><input type="text" value={block.content.subtitle || ''} onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    </div>
                    
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Feature Items</label>
                        <button onClick={() => addItem(index, 'items', { icon: 'lucide-star', title: 'New Feature', text: 'Feature description' })} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Add Feature</button>
                      </div>
                      
                      <div className="space-y-2">
                        {(block.content.items || []).map((item, i) => (
                          <div key={i} className="flex gap-2 items-start border p-2 rounded bg-gray-50">
                            <input type="text" placeholder="Icon (e.g. lucide-star)" value={item.icon || ''} onChange={(e) => handleItemChange(index, 'items', i, 'icon', e.target.value)} className="w-1/4 border border-gray-300 rounded px-2 py-1 text-sm" />
                            <input type="text" placeholder="Title" value={item.title || ''} onChange={(e) => handleItemChange(index, 'items', i, 'title', e.target.value)} className="w-1/4 border border-gray-300 rounded px-2 py-1 text-sm" />
                            <input type="text" placeholder="Description" value={item.text || ''} onChange={(e) => handleItemChange(index, 'items', i, 'text', e.target.value)} className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm" />
                            <button onClick={() => removeItem(index, 'items', i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'highlights' && (
                  <div className="space-y-4">
                    <div><label className="text-sm text-gray-600 mb-1 block">Section Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Highlight Cards</label>
                        <button onClick={() => addItem(index, 'items', { image: 'https://placehold.co/600x400', title: 'New Highlight', text: 'Text here', buttonText: 'Learn More', buttonLink: '#' })} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Add Highlight</button>
                      </div>
                      
                      <div className="space-y-3">
                        {(block.content.items || []).map((item, i) => (
                          <div key={i} className="flex flex-col gap-2 border p-3 rounded bg-gray-50">
                            <div className="flex justify-between">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Card {i+1}</span>
                              <button onClick={() => removeItem(index, 'items', i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            <div className="flex gap-2">
                              <input type="text" placeholder="Image URL" value={item.image || ''} onChange={(e) => handleItemChange(index, 'items', i, 'image', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                              <input type="text" placeholder="Title" value={item.title || ''} onChange={(e) => handleItemChange(index, 'items', i, 'title', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="flex gap-2">
                              <textarea placeholder="Description" value={item.text || ''} onChange={(e) => handleItemChange(index, 'items', i, 'text', e.target.value)} className="flex-[2] border border-gray-300 rounded px-2 py-1 text-sm" rows="1" />
                              <input type="text" placeholder="Btn Text" value={item.buttonText || ''} onChange={(e) => handleItemChange(index, 'items', i, 'buttonText', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'text' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm text-gray-600">Text Content (Markdown supported)</label>
                      <button
                        onClick={() => setMarkdownPreviewBlocks({ ...markdownPreviewBlocks, [index]: !markdownPreviewBlocks[index] })}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <PreviewIcon className="w-3 h-3" />
                        {markdownPreviewBlocks[index] ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {markdownPreviewBlocks[index] ? (
                      <div 
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 min-h-[100px] prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: marked(block.content.content || '') }}
                      />
                    ) : (
                      <textarea 
                        rows={4} 
                        value={block.content.content || ''} 
                        onChange={(e) => updateBlockContent(index, { content: e.target.value })} 
                        className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                        placeholder="**Bold**, *Italic*, # Heading, - List item, [Link](url)"
                      />
                    )}
                  </div>
                )}

                {block.type === 'gallery' && (
                  <div className="space-y-4">
                    <div><label className="text-sm text-gray-600 mb-1 block">Gallery Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Images</label>
                        <button onClick={() => addItem(index, 'images', { url: 'https://placehold.co/600x400', caption: 'Image caption' })} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Add Image</button>
                      </div>
                      
                      <div className="space-y-3">
                        {(block.content.images || []).map((item, i) => (
                          <div key={i} className="flex flex-col gap-2 border p-3 rounded bg-gray-50">
                            <div className="flex justify-between">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Image {i+1}</span>
                              <button onClick={() => removeItem(index, 'images', i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            <input type="text" placeholder="Image URL" value={item.url || ''} onChange={(e) => handleItemChange(index, 'images', i, 'url', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                            <input type="text" placeholder="Caption" value={item.caption || ''} onChange={(e) => handleItemChange(index, 'images', i, 'caption', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'testimonials' && (
                  <div className="space-y-4">
                    <div><label className="text-sm text-gray-600 mb-1 block">Section Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">Testimonials</label>
                        <button onClick={() => addItem(index, 'testimonials', { name: 'John Doe', role: 'CEO', quote: 'This is an amazing product!', avatar: 'https://placehold.co/100x100' })} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Add Testimonial</button>
                      </div>
                      
                      <div className="space-y-3">
                        {(block.content.testimonials || []).map((item, i) => (
                          <div key={i} className="flex flex-col gap-2 border p-3 rounded bg-gray-50">
                            <div className="flex justify-between">
                              <span className="text-xs font-semibold text-gray-500 uppercase">Testimonial {i+1}</span>
                              <button onClick={() => removeItem(index, 'testimonials', i)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" placeholder="Name" value={item.name || ''} onChange={(e) => handleItemChange(index, 'testimonials', i, 'name', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                              <input type="text" placeholder="Role" value={item.role || ''} onChange={(e) => handleItemChange(index, 'testimonials', i, 'role', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                            </div>
                            <textarea placeholder="Quote" value={item.quote || ''} onChange={(e) => handleItemChange(index, 'testimonials', i, 'quote', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" rows="2" />
                            <input type="text" placeholder="Avatar URL" value={item.avatar || ''} onChange={(e) => handleItemChange(index, 'testimonials', i, 'avatar', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'contact' && (
                  <div className="space-y-3">
                    <div><label className="text-sm text-gray-600 mb-1 block">Section Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Subtitle</label><input type="text" value={block.content.subtitle || ''} onChange={(e) => updateBlockContent(index, { subtitle: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Email</label><input type="email" value={block.content.email || ''} onChange={(e) => updateBlockContent(index, { email: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Phone</label><input type="text" value={block.content.phone || ''} onChange={(e) => updateBlockContent(index, { phone: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Address</label><textarea value={block.content.address || ''} onChange={(e) => updateBlockContent(index, { address: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" rows="2" /></div>
                  </div>
                )}

                {block.type === 'video' && (
                  <div className="space-y-3">
                    <div><label className="text-sm text-gray-600 mb-1 block">Video Title</label><input type="text" value={block.content.title || ''} onChange={(e) => updateBlockContent(index, { title: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">YouTube/Vimeo URL</label><input type="text" value={block.content.videoUrl || ''} onChange={(e) => updateBlockContent(index, { videoUrl: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" placeholder="https://www.youtube.com/watch?v=..." /></div>
                    <div><label className="text-sm text-gray-600 mb-1 block">Description</label><textarea value={block.content.description || ''} onChange={(e) => updateBlockContent(index, { description: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" rows="2" /></div>
                  </div>
                )}

                </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        </div>
      </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2">
            <div className="bg-white shadow rounded-lg overflow-hidden sticky top-6">
              <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 text-center text-sm text-gray-400">
                  {previewDevice.charAt(0).toUpperCase() + previewDevice.slice(1)} Preview
                </div>
              </div>
              <div className="bg-gray-100 p-4 overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
                <div 
                  className="mx-auto bg-white shadow-lg overflow-hidden transition-all duration-300"
                  style={{ 
                    width: getDeviceWidth(),
                    minHeight: previewDevice === 'mobile' ? '667px' : '100%'
                  }}
                >
                  <PublicHome previewData={getPreviewData()} previewMode={true} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
