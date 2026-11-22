/**
 * SiteBlock — the single renderer for every block type, used by the public
 * site (pages/public/Home.jsx) AND the editor canvas. Markup is ported 1:1
 * from the original Home.jsx renderBlocks(); text/image/link values go
 * through the field components in ./fields so the editor can make them
 * editable in place.
 *
 * Field names here are the source of truth for block content.
 */
import { Star, Image as ImageIcon, Check, Settings, MessageCircle, RefreshCw, Wrench } from 'lucide-react';
import { SiteEditContext, useSiteEdit, Text, Image, Link, ListAdd } from './fields';
import { rt, renderRichText, buttonClass, resolveUrl } from './siteRichText';

const IconMap = {
  'lucide-star':     Star,
  'lucide-image':    ImageIcon,
  'lucide-check':    Check,
  'lucide-settings': Settings,
  'lucide-message':  MessageCircle,
  'lucide-refresh':  RefreshCw,
  'lucide-wrench':   Wrench,
};

const Arrow = () => <span aria-hidden="true">→</span>;
const SpacedArrow = () => <> <span aria-hidden="true">→</span></>;

/** Shared outer style from block.style + legacy grid placement hints. */
function blockOuterStyle(block) {
  const cs = block.style || {};
  const bc = block.content || {};
  return {
    backgroundColor: cs.backgroundColor,
    color:           cs.color,
    paddingTop:      cs.paddingTop  != null ? `${cs.paddingTop}px`  : cs.padding  != null ? `${cs.padding}px`  : undefined,
    paddingBottom:   cs.paddingBottom != null ? `${cs.paddingBottom}px` : cs.padding != null ? `${cs.padding}px` : undefined,
    marginTop:       cs.marginTop   != null ? `${cs.marginTop}px`   : undefined,
    marginBottom:    cs.marginBottom != null ? `${cs.marginBottom}px` : undefined,
    textAlign:       cs.textAlign,
    borderWidth:     cs.borderWidth,
    borderStyle:     cs.borderStyle,
    borderColor:     cs.borderColor,
    borderRadius:    cs.borderRadius != null ? `${cs.borderRadius}px` : undefined,
    height:          bc._height != null ? `${bc._height}px` : undefined,
    gridColumn:      bc._colStart
      ? `${bc._colStart} / span ${bc._colSpan || 1}`
      : bc._colSpan > 1 ? `span ${bc._colSpan}` : undefined,
    gridRow:         bc._rowStart
      ? `${bc._rowStart} / span ${bc._rowSpan || 1}`
      : bc._rowSpan > 1 ? `span ${bc._rowSpan}` : undefined,
  };
}

export default function SiteBlock({ block }) {
  const edit = useSiteEdit();
  const cs = block.style || {};
  const c = block.content || {};
  const sStyle = blockOuterStyle(block);
  const cc = `${cs.className || ''} public-reveal`;

  switch (block.type) {
    case 'hero': return (
      <section
        // With a photo, the hero fills its whole block (the image used to
        // cover only the padded text area, leaving bands of page colour).
        className={`py-20 px-6 text-center relative bg-cover bg-center bg-no-repeat ${c.backgroundImage ? 'w-full h-full flex flex-col justify-center' : 'max-w-5xl mx-auto'} ${cc}`}
        style={{
          ...sStyle,
          backgroundImage: c.backgroundImage ? `url(${resolveUrl(c.backgroundImage)})` : sStyle?.backgroundImage,
        }}
      >
        {/* Subtle overlay for text readability */}
        {c.backgroundImage && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
        )}
        <div className="relative z-10">
          <Text
            as="h1" path="title" value={c.title} placeholder="Hero title"
            className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
            style={{
              color: sStyle?.color || (c.backgroundImage ? 'hsl(var(--text-inverse))' : 'hsl(var(--text-base))'),
              fontFamily: cs.titleFontFamily || undefined,
              fontSize: cs.titleFontSize ? `${cs.titleFontSize}px` : undefined,
              textAlign: cs.titleTextAlign || undefined,
              fontWeight: cs.titleFontWeight || undefined,
              fontStyle: cs.titleFontStyle || undefined,
            }}
          />
          <Text
            as="p" path="subtitle" value={c.subtitle} placeholder="Hero subtitle" multiline
            // The subtitle box follows the alignment (it stayed centred under a
            // left-aligned title).
            className={`text-xl max-w-2xl ${{ left: 'mr-auto', right: 'ml-auto' }[cs.subtitleTextAlign || cs.textAlign] || 'mx-auto'}`}
            style={{
              // Muted grey is unreadable on a photo — use light text there.
              color: sStyle?.color || (c.backgroundImage ? 'hsl(var(--text-inverse) / 0.9)' : 'hsl(var(--text-muted))'),
              fontFamily: cs.subtitleFontFamily || undefined,
              fontSize: cs.subtitleFontSize ? `${cs.subtitleFontSize}px` : undefined,
              textAlign: cs.subtitleTextAlign || undefined,
              fontWeight: cs.subtitleFontWeight || undefined,
              fontStyle: cs.subtitleFontStyle || undefined,
            }}
          />
          {/* Optional call to action — nothing is rendered on the site until
              it has a label (existing heroes are unchanged). */}
          {(c.buttonText || edit) && (
            <div className="mt-8">
              <Link optional textPath="buttonText" hrefPath="buttonLink" text={c.buttonText} href={c.buttonLink} className={buttonClass(c.buttonVariant || 'gold')} after={<SpacedArrow />} placeholder="Button (optional)" />
            </div>
          )}
        </div>
      </section>
    );

    case 'image': {
      // A photo that fills its block (grid cell on desktop; on phones the
      // auto-stacked item's min-height, inherited). `fit: contain` shows the
      // whole image (logos, posters) instead of cropping it.
      const fit = c.fit === 'contain' ? 'object-contain' : 'object-cover';
      const img = (
        <Image
          path="url" value={c.url} alt={c.alt || ''}
          className={`absolute inset-0 w-full h-full ${fit}`}
          wrapperClassName="absolute inset-0"
          style={{ objectPosition: c.focus || 'center' }}
        />
      );
      return (
        <figure className={`relative w-full h-full m-0 overflow-hidden ${cc}`} style={{ ...sStyle, minHeight: 'inherit' }}>
          {!edit && c.link ? <a href={c.link} aria-label={c.alt || undefined} className="absolute inset-0">{img}</a> : img}
          {c.caption && (
            <figcaption className="absolute bottom-0 left-0 right-0 px-4 py-3 text-sm bg-gradient-to-t from-black/60 to-transparent pointer-events-none" style={{ color: 'hsl(var(--text-inverse))' }}>
              {c.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'button': return (
      <section
        className={`flex items-center h-full px-6 ${cc}`}
        style={{ ...sStyle, justifyContent: { left: 'flex-start', right: 'flex-end' }[c.align] || 'center' }}
      >
        <Link textPath="buttonText" hrefPath="buttonLink" text={c.buttonText} href={c.buttonLink} className={buttonClass(c.buttonVariant || 'gold')} after={<SpacedArrow />} placeholder="Button" />
      </section>
    );

    case 'text': return (
      <section className={`py-12 px-6 max-w-3xl mx-auto ${cc}`} style={sStyle}>
        {edit ? (
          <Text
            path="content" value={c.content} multiline toolbar="full" placeholder="Start writing…"
            className="prose prose-lg max-w-none prose-headings:font-bold prose-p:mb-4 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          />
        ) : (
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-p:mb-4 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: renderRichText(c.content) }}
          />
        )}
      </section>
    );

    case 'trust-bar': return (
      <section className={`public-trust-bar ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {(c.items || []).map((item, index) => (
            <div key={index} className="public-trust-item">
              <Text as="strong" plain path={`items.${index}.number`} value={item.number} placeholder="01" />
              <Text as="span" plain path={`items.${index}.label`} value={item.label} placeholder="Label" />
            </div>
          ))}
        </div>
        <ListAdd path="items" label="Add item" make={() => ({ number: String((c.items || []).length + 1).padStart(2, '0'), label: 'New point' })} />
      </section>
    );

    case 'split-banner': return (
      <section className={`public-split-banner ${cc}`} style={sStyle}>
        <div>
          <Text className="public-eyebrow" path="eyebrow" value={c.eyebrow} placeholder="Eyebrow" />
          <Text as="h2" path="title" value={c.title} placeholder="Title" multiline />
          <Text as="p" path="body" value={c.body} placeholder="Body text" multiline />
          <Link optional textPath="buttonText" hrefPath="buttonLink" text={c.buttonText} href={c.buttonLink} className={buttonClass(c.buttonVariant)} after={<Arrow />} placeholder="Button" />
        </div>
        <div className="public-service-times">
          {(c.times || []).map((time, index) => (
            <div key={index}>
              <Text as="strong" plain path={`times.${index}.label`} value={time.label} placeholder="Label" />
              <Text as="span" plain path={`times.${index}.value`} value={time.value} placeholder="Time" />
            </div>
          ))}
          <ListAdd path="times" label="Add time" make={() => ({ label: 'New gathering', value: '9:00 AM' })} />
        </div>
      </section>
    );

    case 'events': return (
      <section className={`py-20 px-6 ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="public-section-heading">
            <Text className="public-eyebrow" path="eyebrow" value={c.eyebrow} placeholder="Eyebrow" />
            <Text as="h2" path="title" value={c.title} placeholder="Title" multiline />
          </div>
          <div className="public-events">
            {(c.items || []).map((item, index) => (
              <div className="public-event" key={index}>
                <Text as="span" plain className="public-event-date" path={`items.${index}.date`} value={item.date} placeholder="DATE" />
                <div>
                  <Text as="h3" path={`items.${index}.title`} value={item.title} placeholder="Event title" />
                  <Text as="p" path={`items.${index}.description`} value={item.description} placeholder="Description" multiline />
                </div>
                <Text as="span" plain className="public-event-time" path={`items.${index}.time`} value={item.time} placeholder="Time" />
              </div>
            ))}
          </div>
          <ListAdd path="items" label="Add event" make={() => ({ date: 'AUG 18', title: 'New event', description: 'Describe the event.', time: '12:00 PM' })} />
        </div>
      </section>
    );

    case 'quote': return (
      // Design-tab background wins over the older content-level colour (which
      // used to override it, so the Design setting did nothing).
      <section className={`public-quote ${cc}`} style={{ ...sStyle, backgroundColor: sStyle.backgroundColor || c.backgroundColor || '#eadfc9' }}>
        <div className="max-w-6xl mx-auto px-6">
          <Text as="blockquote" path="quote" value={c.quote} prefix="“" suffix="”" placeholder="Quote" multiline />
          {/* With a custom text colour the citation follows it (it is muted grey otherwise). */}
          <Text as="cite" path="citation" value={c.citation} prefix="— " placeholder="Citation" style={cs.color ? { color: 'inherit', opacity: 0.75 } : undefined} />
        </div>
      </section>
    );

    case 'map': return (
      <section className={`py-12 px-6 ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="public-map">
            {c.embedUrl
              ? <iframe src={c.embedUrl} title={c.address || 'Location map'} loading="lazy" style={edit ? { pointerEvents: 'none' } : undefined} />
              : edit
                ? <Text as="span" plain path="address" value={c.address} placeholder="Add a location" />
                : <span>{c.address || 'Add a location'}</span>}
          </div>
        </div>
      </section>
    );

    case 'intro': return (
      <section className={`bg-primary text-primary-foreground py-20 text-center ${cc}`} style={sStyle}>
        <div className="max-w-4xl mx-auto px-6">
          <Text as="h2" className="text-4xl font-bold mb-4" path="title" value={c.title} placeholder="Title" />
          <Text as="p" className="text-xl mb-8 opacity-90" path="content" value={c.content} placeholder="Introduction" multiline />
          <Link optional textPath="buttonText" hrefPath="buttonLink" text={c.buttonText} href={c.buttonLink} className={buttonClass(c.buttonVariant || 'gold')} after={<SpacedArrow />} placeholder="Button" />
        </div>
      </section>
    );

    case 'features': return (
      <section className={`py-20 max-w-6xl mx-auto px-6 ${cc}`} style={sStyle}>
        <div className="text-center mb-16">
          <Text optional className="public-eyebrow mb-3" path="eyebrow" value={c.eyebrow} placeholder="Eyebrow" />
          <Text as="h2" className="text-3xl font-bold mb-2" path="title" value={c.title} placeholder="Title" />
          <Text as="p" className="text-subtle" path="subtitle" value={c.subtitle} placeholder="Subtitle" multiline />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {c.items?.map((item, i) => {
            const IconComp = IconMap[item.icon] || Star;
            // Older content stored the body under `description`; edit whichever exists.
            const bodyKey = item.text != null || item.description == null ? 'text' : 'description';
            return (
              <div key={i} className={`public-feature-card public-feature-card--${item.variant || 'default'}`}>
                <div className="public-feature-icon w-14 h-14 bg-primary-light text-primary rounded-full flex items-center justify-center mb-5">
                  {c.numbered ? <span className="font-bold">{item.number || String(i + 1).padStart(2, '0')}</span> : <IconComp className="w-7 h-7" />}
                </div>
                <Text as="h3" className="text-xl font-bold text-text-base mb-3" path={`items.${i}.title`} value={item.title} placeholder="Feature title" />
                <Text as="p" className="text-muted leading-relaxed" path={`items.${i}.${bodyKey}`} value={item.text || item.description} placeholder="Describe this feature" multiline />
              </div>
            );
          })}
        </div>
        <ListAdd path="items" label="Add feature" make={() => ({ icon: 'lucide-star', number: String((c.items || []).length + 1).padStart(2, '0'), title: 'New feature', text: 'Describe this feature.' })} />
      </section>
    );

    case 'highlights': return (
      <section className={`bg-surface-raised py-20 px-6 ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto">
          <Text optional as="h2" className="text-3xl font-bold text-center mb-12" path="title" value={c.title} placeholder="Title" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {c.items?.map((item, i) => (
              <div key={i} className="bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition pb-6 text-center">
                <Image path={`items.${i}.image`} value={item.image} alt={item.title} className="w-full h-48 object-cover mb-6" />
                <Text as="h3" className="text-xl font-bold text-text-base mb-3 px-4" path={`items.${i}.title`} value={item.title} placeholder="Title" />
                <Text as="p" className="text-muted mb-6 px-4" path={`items.${i}.text`} value={item.text} placeholder="Description" multiline />
                <Link optional textPath={`items.${i}.buttonText`} hrefPath={`items.${i}.buttonLink`} text={item.buttonText} href={item.buttonLink} className={buttonClass(item.buttonVariant || 'outline')} placeholder="Button" />
              </div>
            ))}
          </div>
          <ListAdd path="items" label="Add highlight" make={() => ({ image: '', title: 'New highlight', text: 'Describe it.', buttonText: '', buttonLink: '' })} />
        </div>
      </section>
    );

    case 'gallery': return (
      <section className={`py-20 px-6 bg-surface-raised ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto">
          <Text optional as="h2" className="text-3xl font-bold text-center mb-12" path="title" value={c.title} placeholder="Title" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {c.images?.map((image, i) => (!image.url && !edit) ? null : (
              <div key={i} className="group relative overflow-hidden rounded-lg shadow-md">
                <Image path={`images.${i}.url`} value={image.url} alt={image.caption || `Gallery ${i + 1}`} className="w-full h-64 object-cover group-hover:scale-105 transition duration-300" />
                {(image.caption || edit) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <Text as="p" className="text-inverse text-sm" path={`images.${i}.caption`} value={image.caption} placeholder="Caption" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <ListAdd path="images" label="Add image" make={() => ({ url: '', caption: '' })} />
        </div>
      </section>
    );

    case 'testimonials': return (
      <section className={`py-20 px-6 bg-surface ${cc}`} style={sStyle}>
        <div className="max-w-6xl mx-auto">
          <Text optional as="h2" className="text-3xl font-bold text-center mb-12" path="title" value={c.title} placeholder="Title" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {c.testimonials?.map((t, i) => (
              <div key={i} className="bg-surface-raised rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  {t.avatar && <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />}
                  <div>
                    <Text as="h4" className="font-semibold text-text-base" path={`testimonials.${i}.name`} value={t.name} placeholder="Name" />
                    <Text as="p" className="text-sm text-subtle" path={`testimonials.${i}.role`} value={t.role} placeholder="Role" />
                  </div>
                </div>
                <Text as="p" className="text-muted italic" path={`testimonials.${i}.quote`} value={t.quote} prefix={'"'} suffix={'"'} placeholder="Testimonial" multiline />
              </div>
            ))}
          </div>
          <ListAdd path="testimonials" label="Add testimonial" make={() => ({ name: 'Name', role: 'Role', quote: 'What they said.' })} />
        </div>
      </section>
    );

    case 'contact': {
      // Colours come from the site theme variables directly. (The Tailwind
      // token classes used before — bg-surface-tertiary, text-primary —
      // resolve to the admin palette, which put white text on pale mint.)
      const onDark = { color: 'inherit' };
      const contactItem = (key, labelKey, defaultLabel, icon, valueNode) => (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(var(--accent))', color: 'hsl(var(--text-inverse))' }}>{icon}</div>
          <h3 className="font-semibold mb-2">{c[labelKey] || defaultLabel}</h3>
          {valueNode}
        </div>
      );
      const editValue = (key, placeholder, multiline) => (
        <Text as="p" plain multiline={multiline} className="opacity-90" style={onDark} path={key} value={c[key]} placeholder={placeholder} />
      );
      return (
        <section
          className={`py-20 px-6 ${cc}`}
          style={{ ...sStyle, backgroundColor: sStyle.backgroundColor || 'hsl(var(--primary))', color: sStyle.color || 'hsl(var(--text-inverse))' }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <Text as="h2" className="text-3xl font-bold mb-4" style={onDark} path="title" value={c.title} placeholder="Title" />
            <Text as="p" className="text-xl opacity-80 mb-12" style={onDark} path="subtitle" value={c.subtitle} placeholder="Subtitle" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(c.email || edit) && contactItem('email', 'emailLabel', 'Email',
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                edit ? editValue('email', 'email@example.com') : <a href={`mailto:${c.email}`} className="underline underline-offset-4 opacity-90 hover:opacity-100" style={onDark}>{c.email}</a>)}
              {(c.phone || edit) && contactItem('phone', 'phoneLabel', 'Phone',
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
                edit ? editValue('phone', '+1 (555) 123-4567') : <a href={`tel:${c.phone}`} className="underline underline-offset-4 opacity-90 hover:opacity-100" style={onDark}>{c.phone}</a>)}
              {(c.address || edit) && contactItem('address', 'addressLabel', 'Address',
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                edit ? editValue('address', '123 Main St', true) : <p className="opacity-90">{c.address}</p>)}
            </div>
            {c.showForm && (
              <form className="public-contact-form mt-12 mx-auto max-w-2xl" onSubmit={event => event.preventDefault()} style={edit ? { pointerEvents: 'none' } : undefined}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input required placeholder="Your name" /><input required type="email" placeholder="Email address" /></div>
                <select required defaultValue="" aria-label="Reason for contacting us"><option value="" disabled>What can we help with?</option>{(c.reasonOptions || ['General question', 'Visit planning', 'Community care']).map(reason => <option key={reason}>{reason}</option>)}</select>
                <textarea rows="4" placeholder="Your message" />
                <button type="submit" className={buttonClass(c.buttonVariant || 'gold')}>Send message <span aria-hidden="true">→</span></button>
              </form>
            )}
          </div>
        </section>
      );
    }

    case 'grid': {
      const columns = c.items || [];
      return (
        <section className={`py-12 px-6 ${cc}`} style={sStyle}>
          <div className="flex flex-wrap max-w-7xl mx-auto" style={{ gap: `${c.gap || 24}px` }}>
            {columns.map((col, i) => (
              <div key={i} style={col.width ? { flex: `0 0 ${col.width}` } : { flex: '1 1 0%' }}>
                {/* Nested blocks render read-only in the editor (legacy layout). */}
                <SiteEditContext.Provider value={null}>
                  {(col.blocks || []).map((nested, n) => <SiteBlock key={nested.id || n} block={nested} />)}
                </SiteEditContext.Provider>
                {edit?.NestedAdd && <edit.NestedAdd colIndex={i} />}
              </div>
            ))}
          </div>
        </section>
      );
    }

    case 'video': {
      let embedUrl = '';
      if (c.videoUrl) {
        const yt = c.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        const vm = c.videoUrl.match(/vimeo\.com\/(\d+)/);
        if (yt) embedUrl = `https://www.youtube.com/embed/${yt[1]}`;
        else if (vm) embedUrl = `https://player.vimeo.com/video/${vm[1]}`;
      }
      return (
        <section className={`py-20 px-6 bg-surface-raised ${cc}`} style={sStyle}>
          <div className="max-w-4xl mx-auto text-center">
            <Text optional as="h2" className="text-3xl font-bold text-text-base mb-4" path="title" value={c.title} placeholder="Title" />
            <Text optional as="p" className="text-xl text-muted mb-12" path="description" value={c.description} placeholder="Description" multiline />
            {embedUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <iframe src={embedUrl} title={c.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={edit ? { pointerEvents: 'none' } : undefined} />
              </div>
            ) : (
              <div className="bg-surface-tertiary rounded-lg p-12 text-subtle">Add a YouTube or Vimeo URL to display the video</div>
            )}
          </div>
        </section>
      );
    }

    default:
      return edit
        ? <div className="p-8 border-2 border-dashed border-border rounded text-center text-muted">Unknown block type: {block.type}</div>
        : null;
  }
}

// Re-export for callers that render raw rich text outside a block.
export { rt };
