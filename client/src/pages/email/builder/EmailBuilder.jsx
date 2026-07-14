import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import DOMPurify from 'dompurify';
import { Eye, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import api from '../../../utils/api';
import BuilderHistoryControls from '../../../components/builder/BuilderHistoryControls';
import BuilderPreviewControls from '../../../components/builder/BuilderPreviewControls';
import BuilderSaveStatus from '../../../components/builder/BuilderSaveStatus';
import BuilderToolbar from '../../../components/builder/BuilderToolbar';
import useDocumentHistory from '../../../components/builder/useDocumentHistory';
import { compileEmailHtml, createBlock, createDocument, EMAIL_BLOCKS } from './emailBlocks';

const blockTitle = (block) => EMAIL_BLOCKS.find((definition) => definition.type === block.type)?.label || block.type;

function CanvasBlock({ block, selected, onSelect }) {
  const { data = {} } = block;
  return <button type="button" onClick={onSelect} className={`block w-full cursor-pointer border-2 text-left transition-colors ${selected ? 'border-primary shadow-card' : 'border-transparent hover:border-border-strong'} rounded-base bg-surface`}>
    {block.type === 'text' && <div className="p-5 text-base" style={{ color: data.color, textAlign: data.align }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content || '', { ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'h1', 'h2', 'h3', 'li', 'ol', 'p', 'span', 'strong', 'ul'], ALLOWED_ATTR: ['href', 'style'] }) }} />}
    {block.type === 'image' && <img src={data.src} alt={data.alt} className="block w-full" />}
    {block.type === 'button' && <div className="p-5" style={{ textAlign: data.align }}><span className="inline-block rounded-sm px-4 py-2 text-sm font-semibold" style={{ backgroundColor: data.backgroundColor, color: data.color }}>{data.label}</span></div>}
    {block.type === 'divider' && <div className="p-5"><div className="h-px" style={{ width: `${data.width}%`, backgroundColor: data.color }} /></div>}
    {block.type === 'spacer' && <div className="flex items-center justify-center bg-surface-raised text-xs text-subtle" style={{ height: Math.max(8, data.height) }}>Spacer · {data.height}px</div>}
    {block.type === 'columns' && <div className="grid grid-cols-2 gap-4 p-5"><div className="min-h-24 p-4 text-sm" style={{ backgroundColor: data.backgroundColor }}>{data.left}</div><div className="min-h-24 p-4 text-sm" style={{ backgroundColor: data.backgroundColor }}>{data.right}</div></div>}
  </button>;
}

function Inspector({ block, onUpdate, onDelete }) {
  if (!block) return <aside className="w-80 shrink-0 border-l border-border bg-surface p-5"><p className="text-body text-muted">Select a block to edit its content and styles.</p></aside>;
  const update = (key, value) => onUpdate({ ...block, data: { ...block.data, [key]: value } });
  const inputClass = 'mt-1 w-full rounded-base border border-border-strong bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-primary';
  return <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-surface p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-label font-medium uppercase tracking-wide text-subtle">Selected block</p><h2 className="mt-1 font-semibold text-base">{blockTitle(block)}</h2></div><button type="button" onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-base text-danger hover:bg-danger-light" title="Delete block"><Trash2 className="h-4 w-4" /></button></div>
    {block.type === 'text' && <><label className="text-small font-medium text-base">Content<textarea value={block.data.content} onChange={(event) => update('content', event.target.value)} className={`${inputClass} min-h-40 font-mono text-small`} /></label><label className="mt-4 block text-small font-medium text-base">Text color<input type="color" value={block.data.color} onChange={(event) => update('color', event.target.value)} className="mt-1 h-10 w-full" /></label></>}
    {block.type === 'image' && <><label className="text-small font-medium text-base">Image URL<input value={block.data.src} onChange={(event) => update('src', event.target.value)} className={inputClass} /></label><label className="mt-4 block text-small font-medium text-base">Alt text<input value={block.data.alt} onChange={(event) => update('alt', event.target.value)} className={inputClass} /></label><label className="mt-4 block text-small font-medium text-base">Link URL<input value={block.data.href} onChange={(event) => update('href', event.target.value)} className={inputClass} /></label></>}
    {block.type === 'button' && <><label className="text-small font-medium text-base">Label<input value={block.data.label} onChange={(event) => update('label', event.target.value)} className={inputClass} /></label><label className="mt-4 block text-small font-medium text-base">Link URL<input value={block.data.href} onChange={(event) => update('href', event.target.value)} className={inputClass} /></label><label className="mt-4 block text-small font-medium text-base">Button color<input type="color" value={block.data.backgroundColor} onChange={(event) => update('backgroundColor', event.target.value)} className="mt-1 h-10 w-full" /></label></>}
    {block.type === 'divider' && <><label className="text-small font-medium text-base">Color<input type="color" value={block.data.color} onChange={(event) => update('color', event.target.value)} className="mt-1 h-10 w-full" /></label><label className="mt-4 block text-small font-medium text-base">Width<input type="range" min="20" max="100" value={block.data.width} onChange={(event) => update('width', Number(event.target.value))} className="mt-2 w-full" /></label></>}
    {block.type === 'spacer' && <label className="text-small font-medium text-base">Height<input type="range" min="8" max="160" step="8" value={block.data.height} onChange={(event) => update('height', Number(event.target.value))} className="mt-2 w-full" /></label>}
    {block.type === 'columns' && <><label className="text-small font-medium text-base">Left column<textarea value={block.data.left} onChange={(event) => update('left', event.target.value)} className={`${inputClass} min-h-24`} /></label><label className="mt-4 block text-small font-medium text-base">Right column<textarea value={block.data.right} onChange={(event) => update('right', event.target.value)} className={`${inputClass} min-h-24`} /></label></>}
  </aside>;
}

export default function EmailBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { value: document, commit, reset, undo, redo, canUndo, canRedo } = useDocumentHistory(createDocument());
  const [name, setName] = useState('Untitled template');
  const [subject, setSubject] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [templateStatus, setTemplateStatus] = useState('draft');
  const selected = document.blocks.find((block) => block.id === selectedId);
  const html = useMemo(() => compileEmailHtml(document), [document]);

  useEffect(() => {
    if (!isEditing) return;
    api.get(`/email/templates/${id}`).then(({ data }) => { setName(data.name); setSubject(data.subject); setTemplateStatus(data.status); reset(JSON.parse(data.document)); }).catch(() => navigate('/hub-admin/email/templates'));
  }, [id, isEditing, navigate, reset]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      if (modifier && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, undo]);

  const updateBlocks = (nextBlocks) => commit((current) => ({ ...current, blocks: nextBlocks }));
  const addBlock = (type) => { const block = createBlock(type); updateBlocks([...document.blocks, block]); setSelectedId(block.id); };
  const save = async () => {
    if (!name.trim()) return;
    setSaveStatus('saving');
    try { const payload = { name, subject, document: JSON.stringify(document), bodyHtml: html, status: templateStatus }; const response = isEditing ? await api.put(`/email/templates/${id}`, payload) : await api.post('/email/templates', payload); setSaveStatus('saved'); if (!isEditing) navigate(`/hub-admin/email/templates/${response.data.id}/edit`, { replace: true }); } catch { setSaveStatus('error'); }
  };

  return <div className="flex h-[calc(100vh-4rem)] min-h-[620px] bg-background"><main className="flex min-w-0 flex-1 flex-col"><BuilderToolbar title={name || 'Untitled template'} description="Email template builder" onBack={() => navigate('/hub-admin/email/templates')} status={<BuilderSaveStatus status={saveStatus} />}><BuilderHistoryControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} /><BuilderPreviewControls value={previewDevice} onChange={setPreviewDevice} /><button type="button" onClick={() => setTemplateStatus((status) => status === 'published' ? 'draft' : 'published')} className={`min-h-[40px] rounded-base px-3 text-body font-medium ${templateStatus === 'published' ? 'bg-success-light text-success' : 'border border-border bg-surface-raised text-muted'}`}>{templateStatus === 'published' ? 'Published' : 'Draft'}</button><button type="button" onClick={save} className="inline-flex min-h-[40px] items-center gap-2 rounded-base bg-primary px-3 text-body font-medium text-primary-foreground hover:bg-primary-hover"><Save className="h-4 w-4" />Save draft</button></BuilderToolbar><div className="flex min-h-0 flex-1"><aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-surface p-4"><p className="text-label font-medium uppercase tracking-wide text-subtle">Content</p><div className="mt-3 space-y-2">{EMAIL_BLOCKS.map((block) => <button key={block.type} type="button" onClick={() => addBlock(block.type)} className="flex w-full items-start gap-3 rounded-base border border-border p-3 text-left hover:border-primary hover:bg-primary-light"><Plus className="mt-0.5 h-4 w-4 text-primary" /><span><span className="block text-small font-medium text-base">{block.label}</span><span className="mt-0.5 block text-xs text-muted">{block.description}</span></span></button>)}</div><div className="mt-6 space-y-3 border-t border-border pt-5"><label className="block text-small font-medium text-base">Template name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-base border border-border-strong bg-surface px-3 py-2 text-body" /></label><label className="block text-small font-medium text-base">Subject line<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-base border border-border-strong bg-surface px-3 py-2 text-body" /></label></div></aside><section className="min-w-0 flex-1 overflow-y-auto bg-surface-raised p-6"><div className={`${previewDevice === 'mobile' ? 'max-w-sm' : previewDevice === 'tablet' ? 'max-w-xl' : 'max-w-2xl'} mx-auto rounded-card border border-border bg-surface shadow-card`}><DragDropContext onDragEnd={({ source, destination }) => { if (!destination || source.index === destination.index) return; const blocks = [...document.blocks]; const [moved] = blocks.splice(source.index, 1); blocks.splice(destination.index, 0, moved); updateBlocks(blocks); }}><Droppable droppableId="email-blocks">{(provided) => <div ref={provided.innerRef} {...provided.droppableProps}>{document.blocks.map((block, index) => <Draggable key={block.id} draggableId={block.id} index={index}>{(dragProvided) => <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="relative group"><div {...dragProvided.dragHandleProps} className="absolute left-1 top-1 z-10 hidden rounded bg-surface p-1 text-muted shadow-card group-hover:block"><GripVertical className="h-4 w-4" /></div><CanvasBlock block={block} selected={selectedId === block.id} onSelect={() => setSelectedId(block.id)} /></div>}</Draggable>)}{provided.placeholder}{document.blocks.length === 0 && <div className="p-16 text-center text-body text-muted">Add a content block to start building.</div>}</div>}</Droppable></DragDropContext></div><button type="button" onClick={() => window.open(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, '_blank')} className="mx-auto mt-4 flex items-center gap-2 text-small text-primary hover:underline"><Eye className="h-4 w-4" />Open email-safe HTML preview</button></section><Inspector block={selected} onUpdate={(next) => updateBlocks(document.blocks.map((block) => block.id === next.id ? next : block))} onDelete={() => { updateBlocks(document.blocks.filter((block) => block.id !== selectedId)); setSelectedId(null); }} /></div></main></div>;
}
