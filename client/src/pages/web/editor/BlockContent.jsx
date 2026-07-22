import React, { useMemo, useCallback } from 'react';
import {
  HeroBlock,
  StructuredBlockEditor,
} from './editorComponents';
import { makeDefaultBlockContent } from './editorUtils';

export default function BlockContent({
  block,
  EditableText,
  EditableButton,
  EditableImage,
  onUpdateContent,
  onUpdateBlock,
  onAddNestedBlock,
}) {
  const ubc = (updates) => onUpdateContent(updates);
  const updateBlockContent = (_s, _b, updates) => onUpdateContent(updates);
  const updateBlock = (_s, _b, updates) => onUpdateBlock?.(updates);
  const addNestedBlock = (_s, _b, colIndex, type) => onAddNestedBlock?.(colIndex, type);
  const sIdx = 0;
  const bIdx = 0;

  switch (block.type) {
    case 'hero':
      return (
        <HeroBlock
          block={block}
          index={bIdx}
          updateBlockContent={(idx, updates) => updateBlockContent(sIdx, idx, updates)}
          updateBlock={(idx, updates) => updateBlock(sIdx, idx, updates)}
          EditableText={EditableText}
        />
      );

    case 'text':
      return (
        <div className="py-8 px-6 max-w-3xl mx-auto">
          <EditableText
            content={block.content.content}
            onChange={(value) => updateBlockContent(sIdx, bIdx, { content: value })}
            placeholder="Start writing your content here..."
            className="prose prose-sm max-w-none focus:outline-none"
            tag="div"
            multiline
            minHeight={220}
          />
        </div>
      );

    case 'trust-bar':
    case 'split-banner':
    case 'events':
    case 'quote':
    case 'map':
      return <StructuredBlockEditor block={block} onChange={ubc} />;

    case 'intro':
      return (
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
      );

    case 'features':
      return (
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
      );

    case 'highlights':
      return (
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
      );

    case 'gallery':
      return (
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
      );

    case 'testimonials':
      return (
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
      );

    case 'contact':
      return (
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
      );

    case 'video':
      return (
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
      );

    case 'grid':
      return (
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
      );

    default:
      return (
        <div className="p-8 border-2 border-dashed border-border rounded-base text-center">
          <p className="text-muted">Unknown block type: {block.type}</p>
        </div>
      );
  }
}
