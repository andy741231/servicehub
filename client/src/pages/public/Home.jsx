import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { marked } from 'marked';
import api from '../../utils/api';
import { Globe, Star, Image as ImageIcon, Check, Settings, MessageCircle, RefreshCw, Wrench } from 'lucide-react';

const resolveUrl = (url) => {
  if (!url) return '';
  url = url.replace(/['"]/g, ''); // Strip quotes
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

// Simple icon map for the features block
const IconMap = {
  'lucide-star':     Star,
  'lucide-image':    ImageIcon,
  'lucide-check':    Check,
  'lucide-settings': Settings,
  'lucide-message':  MessageCircle,
  'lucide-refresh':  RefreshCw,
  'lucide-wrench':   Wrench,
};

export default function PublicHome({ previewData = null, previewMode = false }) {
  const { slug } = useParams();           // undefined on /, set on /:slug

  const [loading,  setLoading]  = useState(!previewMode);
  const [pageData, setPageData] = useState(null);

  useEffect(() => {
    if (previewMode && previewData) {
      setPageData(previewData);
      setLoading(false);
      return;
    }
    const pageSlug = slug || 'home';
    api.get(`/web/${pageSlug}`)
      .then(({ data }) => setPageData(data))
      .catch(err => console.error('Failed to fetch public page:', err))
      .finally(() => setLoading(false));
  }, [previewMode, previewData, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <Globe className="w-12 h-12 text-blue-300 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        {!previewMode && <a href="/" className="text-blue-600 hover:underline">Go home</a>}
      </div>
    );
  }

  const header = pageData.header || {};
  const footer = pageData.footer || {};

  // ── Helpers ──────────────────────────────────────────────────────────────

  const renderNavItems = (items) => {
    if (!items?.length) return null;
    return (
      <nav className="flex gap-6 text-sm">
        {items.map((item, i) => (
          <div key={i} className="relative group">
            {item.children?.length ? (
              <>
                <button className="hover:text-blue-600 transition">{item.label}</button>
                <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg border rounded-md py-2 min-w-[160px] z-10">
                  {item.children.map((child, ci) => (
                    <a key={ci} href={child.href || '#'} className="block px-4 py-2 text-sm hover:bg-gray-100">{child.label}</a>
                  ))}
                </div>
              </>
            ) : (
              <a href={item.href || '#'} className="hover:text-blue-600 transition">{item.label}</a>
            )}
          </div>
        ))}
      </nav>
    );
  };

  const renderHeader = () => {
    const logoText  = header?.logo?.text ?? pageData.title;
    const logoImage = resolveUrl(header?.logo?.imageUrl);
    const logoWidth = header?.logo?.width;
    const logoHeight = header?.logo?.height;
    // Use the Pages-list nav injected by the server; fall back to legacy header.navigation
    const nav       = pageData.nav?.length ? pageData.nav : (header?.navigation || []);
    const hStyle    = { backgroundColor: header?.styles?.backgroundColor, color: header?.styles?.textColor };

    const logoStyle = {
      width: logoWidth ? `${logoWidth}px` : 'auto',
      height: logoHeight ? `${logoHeight}px` : '32px',
    };

    return (
      <header className="bg-white border-b border-gray-200 py-4 px-6" style={hStyle}>
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-xl font-bold flex items-center gap-2">
            {logoImage
              ? <img src={logoImage} alt={logoText} className="w-auto object-contain" style={logoStyle} />
              : <Globe className="w-6 h-6 text-blue-500" />}
            <a href="/">{logoText}</a>
          </div>
          {renderNavItems(nav)}
        </div>
      </header>
    );
  };

  const renderFooter = () => {
    const sections  = footer?.sections || [];
    const copyright = footer?.copyright || `&copy; ${new Date().getFullYear()} ${pageData.title}. All rights reserved.`;
    const fStyle    = { backgroundColor: footer?.styles?.backgroundColor, color: footer?.styles?.textColor };

    return (
      <footer className="bg-gray-100 border-t border-gray-200 py-12 px-6" style={fStyle}>
        <div className="max-w-6xl mx-auto text-center">
          {sections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-left">
              {sections.map((section, i) => (
                <div key={i}>
                  {section.title && <h3 className="text-lg font-bold mb-4">{section.title}</h3>}
                  {section.type === 'contact-form' && (
                    <form className="space-y-3" onSubmit={e => e.preventDefault()}>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text"  placeholder="Name"    className="border rounded px-3 py-2 text-sm" />
                        <input type="email" placeholder="Email"   className="border rounded px-3 py-2 text-sm" />
                      </div>
                      <textarea placeholder="Message" rows="3" className="w-full border rounded px-3 py-2 text-sm" />
                      <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Send Message</button>
                    </form>
                  )}
                  {section.type === 'contact-info' && (
                    <div className="space-y-2 text-sm">
                      {section.email   && <p>{section.email}</p>}
                      {section.phone   && <p>{section.phone}</p>}
                      {section.address && <p>{section.address}</p>}
                    </div>
                  )}
                  {section.type === 'links' && section.links?.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                      {section.links.map((link, li) => (
                        <a key={li} href={link.href || '#'} className="hover:underline">{link.label}</a>
                      ))}
                    </div>
                  )}
                  {section.type === 'text' && section.content && (
                    <p className="text-sm">{section.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="text-sm opacity-70" dangerouslySetInnerHTML={{ __html: copyright }} />
        </div>
      </footer>
    );
  };

  const renderBlocks = (blocks) => {
    if (!blocks?.length) return null;
    return blocks.map((block) => {
      const cs = block.style || {};
      const sStyle = {
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
      };
      const cc = cs.className || '';

      if (block.type === 'hero') return (
        <section
          key={block.id}
          className={`py-20 px-6 text-center relative bg-cover bg-center bg-no-repeat ${block.content.backgroundImage ? 'w-full' : 'max-w-5xl mx-auto'} ${cc}`}
          style={{
            ...sStyle,
            backgroundImage: block.content.backgroundImage ? `url(${resolveUrl(block.content.backgroundImage)})` : sStyle?.backgroundImage,
          }}
        >
          {/* Subtle overlay for text readability */}
          {block.content.backgroundImage && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          )}

          <div className="relative z-10">
            <h1
              className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
              style={{
                color: sStyle?.color || (block.content.backgroundImage ? 'hsl(var(--text-inverse))' : 'hsl(var(--text-base))'),
                fontFamily: cs.titleFontFamily || undefined,
                fontSize: cs.titleFontSize ? `${cs.titleFontSize}px` : undefined,
                textAlign: cs.titleTextAlign || undefined,
                fontWeight: cs.titleFontWeight || undefined,
                fontStyle: cs.titleFontStyle || undefined,
              }}
            >
              {block.content.title}
            </h1>
            <p
              className="text-xl max-w-2xl mx-auto"
              style={{
                color: sStyle?.color || (block.content.backgroundImage ? 'hsl(var(--text-muted))' : 'hsl(var(--text-muted))'),
                fontFamily: cs.subtitleFontFamily || undefined,
                fontSize: cs.subtitleFontSize ? `${cs.subtitleFontSize}px` : undefined,
                textAlign: cs.subtitleTextAlign || undefined,
                fontWeight: cs.subtitleFontWeight || undefined,
                fontStyle: cs.subtitleFontStyle || undefined,
              }}
            >
              {block.content.subtitle}
            </p>
          </div>
        </section>
      );

      if (block.type === 'text') return (
        <section key={block.id} className={`py-12 px-6 max-w-3xl mx-auto ${cc}`} style={sStyle}>
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: marked(block.content.content || '') }}
          />
        </section>
      );

      if (block.type === 'intro') return (
        <section key={block.id} className={`bg-blue-600 text-white py-20 text-center ${cc}`} style={sStyle}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl font-bold mb-4">{block.content.title}</h2>
            <p className="text-xl mb-8 opacity-90">{block.content.content}</p>
            {block.content.buttonText && (
              <a href={block.content.buttonLink || '#'} className="bg-white text-blue-600 px-6 py-3 rounded font-bold hover:bg-gray-100">
                {block.content.buttonText}
              </a>
            )}
          </div>
        </section>
      );

      if (block.type === 'features') return (
        <section key={block.id} className={`py-20 max-w-6xl mx-auto px-6 ${cc}`} style={sStyle}>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-2">{block.content.title}</h2>
            <p className="text-gray-500">{block.content.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {block.content.items?.map((item, i) => {
              const IconComp = IconMap[item.icon] || Star;
              return (
                <div key={i} className="flex flex-col items-start">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-5">
                    <IconComp className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      );

      if (block.type === 'highlights') return (
        <section key={block.id} className={`bg-gray-50 py-20 px-6 ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {block.content.items?.map((item, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition pb-6 text-center">
                  <img src={item.image} alt={item.title} className="w-full h-48 object-cover mb-6" />
                  <h3 className="text-xl font-bold text-gray-800 mb-3 px-4">{item.title}</h3>
                  <p className="text-gray-600 mb-6 px-4">{item.text}</p>
                  {item.buttonText && (
                    <a href={item.buttonLink || '#'} className="inline-block border-2 border-gray-200 text-gray-600 font-bold px-6 py-2 rounded hover:border-blue-400 hover:text-blue-600 transition">
                      {item.buttonText}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

      if (block.type === 'gallery') return (
        <section key={block.id} className={`py-20 px-6 bg-gray-50 ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {block.content.images?.map((image, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg shadow-md">
                  <img src={image.url} alt={image.caption || `Gallery ${i+1}`} className="w-full h-64 object-cover group-hover:scale-105 transition duration-300" />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white text-sm">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

      if (block.type === 'testimonials') return (
        <section key={block.id} className={`py-20 px-6 bg-white ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {block.content.testimonials?.map((t, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    {t.avatar && <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />}
                    <div>
                      <h4 className="font-semibold text-gray-800">{t.name}</h4>
                      <p className="text-sm text-gray-500">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 italic">"{t.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

      if (block.type === 'contact') return (
        <section key={block.id} className={`py-20 px-6 bg-gray-900 text-white ${cc}`} style={sStyle}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{block.content.title}</h2>
            <p className="text-xl text-gray-300 mb-12">{block.content.subtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {block.content.email && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">Email</h3>
                  <a href={`mailto:${block.content.email}`} className="text-blue-400 hover:text-blue-300">{block.content.email}</a>
                </div>
              )}
              {block.content.phone && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">Phone</h3>
                  <a href={`tel:${block.content.phone}`} className="text-blue-400 hover:text-blue-300">{block.content.phone}</a>
                </div>
              )}
              {block.content.address && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">Address</h3>
                  <p className="text-gray-300">{block.content.address}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      );

      if (block.type === 'grid') {
        const grid = block.content || {};
        const columns = grid.items || [];
        return (
          <section key={block.id} className={`py-12 px-6 ${cc}`} style={sStyle}>
            <div className="flex flex-wrap max-w-7xl mx-auto" style={{ gap: `${grid.gap || 24}px` }}>
              {columns.map((col, i) => (
                <div key={i} style={col.width ? { flex: `0 0 ${col.width}` } : { flex: '1 1 0%' }}>
                  {renderBlocks(col.blocks)}
                </div>
              ))}
            </div>
          </section>
        );
      }

      if (block.type === 'video') {
        let embedUrl = '';
        if (block.content.videoUrl) {
          const yt = block.content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
          const vm = block.content.videoUrl.match(/vimeo\.com\/(\d+)/);
          if (yt) embedUrl = `https://www.youtube.com/embed/${yt[1]}`;
          else if (vm) embedUrl = `https://player.vimeo.com/video/${vm[1]}`;
        }
        return (
          <section key={block.id} className={`py-20 px-6 bg-gray-50 ${cc}`} style={sStyle}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{block.content.title}</h2>
              {block.content.description && <p className="text-xl text-gray-600 mb-12">{block.content.description}</p>}
              {embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                  <iframe src={embedUrl} title={block.content.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div className="bg-gray-200 rounded-lg p-12 text-gray-500">Add a YouTube or Vimeo URL to display the video</div>
              )}
            </div>
          </section>
        );
      }

      return null;
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {renderHeader()}
      <main>{renderBlocks(pageData.blocks)}</main>
      {renderFooter()}
    </div>
  );
}
