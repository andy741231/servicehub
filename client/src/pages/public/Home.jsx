import { useState, useEffect } from 'react';
import { marked } from 'marked';
import api from '../../utils/api';
import { Globe, Star, Image as ImageIcon, Check, Settings, MessageCircle, RefreshCw, Wrench } from 'lucide-react';

// Simple icon map for the features block
const IconMap = {
  'lucide-star': Star,
  'lucide-image': ImageIcon,
  'lucide-check': Check,
  'lucide-settings': Settings,
  'lucide-message': MessageCircle,
  'lucide-refresh': RefreshCw,
  'lucide-wrench': Wrench,
};

const THEME_STYLES = {
  modern: {
    container: 'min-h-screen bg-slate-50 font-sans text-slate-900',
    hero: 'py-20 px-6 max-w-5xl mx-auto text-center',
    heroTitle: 'text-5xl md:text-6xl font-extrabold tracking-tight text-blue-900 mb-6',
    heroSubtitle: 'text-xl text-slate-600 max-w-2xl mx-auto',
    textBlock: 'py-12 px-6 max-w-3xl mx-auto text-lg text-slate-700 leading-relaxed',
  },
  classic: {
    container: 'min-h-screen bg-[#fcfbf9] font-serif text-gray-900',
    hero: 'py-24 px-6 max-w-4xl mx-auto text-center border-b border-gray-200',
    heroTitle: 'text-5xl md:text-6xl font-bold text-gray-900 mb-6 uppercase tracking-widest',
    heroSubtitle: 'text-2xl text-gray-600 italic max-w-2xl mx-auto',
    textBlock: 'py-16 px-6 max-w-2xl mx-auto text-xl text-gray-800 leading-loose',
  },
  minimal: {
    container: 'min-h-screen bg-white font-mono text-black',
    hero: 'py-32 px-6 max-w-4xl mx-auto',
    heroTitle: 'text-4xl md:text-5xl font-black lowercase mb-8',
    heroSubtitle: 'text-lg max-w-xl opacity-70',
    textBlock: 'py-12 px-6 max-w-xl mx-auto text-base leading-normal',
  },
  'escape-velocity': {
    container: 'min-h-screen bg-white font-sans text-gray-800',
    // Escape Velocity has distinct sections with different background colors
    header: 'bg-[#2b252c] text-white py-12 px-6',
    headerTitle: 'text-4xl font-bold tracking-wider text-center text-white',
    intro: 'bg-[#e97770] text-white py-24 px-6 text-center shadow-inner',
    introTitle: 'text-4xl font-bold mb-6',
    introText: 'text-xl max-w-3xl mx-auto font-light leading-relaxed mb-8',
    introBtn: 'inline-block bg-[#332b34] text-white font-bold px-8 py-4 rounded hover:bg-[#433b44] transition',
    features: 'py-20 px-6 max-w-6xl mx-auto text-center',
    featuresTitle: 'text-3xl font-bold text-gray-800 mb-2',
    featuresSubtitle: 'text-xl text-gray-500 font-light mb-12',
    highlights: 'bg-[#ececec] py-20 px-6 border-t border-gray-300',
    highlightsTitle: 'text-3xl font-bold text-center text-gray-800 mb-12',
  }
};

export default function PublicHome({ previewData = null, previewMode = false }) {
  const [loading, setLoading] = useState(!previewMode);
  const [pageData, setPageData] = useState(null);

  useEffect(() => {
    if (previewMode && previewData) {
      setPageData(previewData);
      setLoading(false);
      return;
    }

    const fetchPage = async () => {
      try {
        const { data } = await api.get('/web/home');
        setPageData(data);
      } catch (error) {
        console.error('Failed to fetch public page:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [previewMode, previewData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <Globe className="w-12 h-12 text-blue-300 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Website Not Found</h1>
        <p className="text-gray-500 mb-8">The page content could not be loaded.</p>
        {!previewMode && <a href="/web" className="text-blue-600 hover:underline">Go to Admin Portal</a>}
      </div>
    );
  }

  const themeKey = THEME_STYLES[pageData.template] ? pageData.template : 'modern';
  const theme = THEME_STYLES[themeKey];

  return (
    <div className={theme.container}>
      {/* Header section varies significantly in escape-velocity */}
      {themeKey === 'escape-velocity' ? (
        <header className={theme.header}>
          <div className="max-w-6xl mx-auto flex flex-col items-center">
            <h1 className={theme.headerTitle}><a href="/">{pageData.title}</a></h1>
            <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">A dynamic site template</p>
          </div>
        </header>
      ) : (
        <header className="p-6 flex justify-between items-center max-w-7xl mx-auto border-b">
          <div className="font-bold text-xl flex items-center gap-2">
            <Globe className="w-6 h-6" />
            {pageData.title}
          </div>
          <a href="/web" className="text-sm opacity-70 hover:opacity-100 transition">Admin Login →</a>
        </header>
      )}

      {/* Dynamic Blocks */}
      <main>
        {pageData.blocks?.map((block) => {
          // Apply custom styles if they exist
          const customStyle = block.style || {};
          const sectionStyle = {
            backgroundColor: customStyle.backgroundColor || undefined,
            color: customStyle.textColor || undefined,
            padding: customStyle.padding ? `${customStyle.padding}px` : undefined,
            margin: customStyle.margin ? `${customStyle.margin}px` : undefined,
          };
          const customClasses = customStyle.customClasses || '';

          if (block.type === 'hero') {
            return (
              <section key={block.id} className={`${theme.hero || 'py-20 text-center'} ${customClasses}`} style={sectionStyle}>
                <h1 className={theme.heroTitle || 'text-5xl font-bold mb-4'}>{block.content.title}</h1>
                <p className={theme.heroSubtitle || 'text-xl'}>{block.content.subtitle}</p>
              </section>
            );
          }

          if (block.type === 'text') {
            return (
              <section key={block.id} className={`${theme.textBlock || 'py-12 max-w-3xl mx-auto px-6'} ${customClasses}`} style={sectionStyle}>
                <div 
                  className="prose prose-lg max-w-none prose-headings:font-bold prose-p:mb-4 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4"
                  dangerouslySetInnerHTML={{ __html: marked(block.content.content || '') }}
                />
              </section>
            );
          }

          if (block.type === 'intro') {
            return (
              <section key={block.id} className={`${theme.intro || 'bg-blue-600 text-white py-20 text-center'} ${customClasses}`} style={sectionStyle}>
                <div className="max-w-4xl mx-auto px-6">
                  <h2 className={theme.introTitle || 'text-4xl font-bold mb-4'}>{block.content.title}</h2>
                  <p className={theme.introText || 'text-xl mb-8 opacity-90'}>{block.content.content}</p>
                  {block.content.buttonText && (
                    <a href={block.content.buttonLink || '#'} className={theme.introBtn || 'bg-white text-blue-600 px-6 py-3 rounded font-bold hover:bg-gray-100'}>
                      {block.content.buttonText}
                    </a>
                  )}
                </div>
              </section>
            );
          }

          if (block.type === 'features') {
            return (
              <section key={block.id} className={`${theme.features || 'py-20 max-w-6xl mx-auto px-6'} ${customClasses}`} style={sectionStyle}>
                <div className="text-center mb-16">
                  <h2 className={theme.featuresTitle || 'text-3xl font-bold mb-2'}>{block.content.title}</h2>
                  <p className={theme.featuresSubtitle || 'text-gray-500'}>{block.content.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {block.content.items?.map((item, i) => {
                    const IconComp = IconMap[item.icon] || Star;
                    return (
                      <div key={i} className="text-center md:text-left flex flex-col items-center md:items-start">
                        <div className="w-16 h-16 bg-[#e97770] text-white rounded-full flex items-center justify-center mb-6">
                          <IconComp className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{item.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (block.type === 'highlights') {
            return (
              <section key={block.id} className={`${theme.highlights || 'bg-gray-100 py-20 px-6'} ${customClasses}`} style={sectionStyle}>
                <div className="max-w-6xl mx-auto">
                  <h2 className={theme.highlightsTitle || 'text-3xl font-bold text-center mb-12'}>{block.content.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {block.content.items?.map((item, i) => (
                      <div key={i} className="bg-white rounded overflow-hidden shadow-sm hover:shadow-md transition pb-6 text-center">
                        <img src={item.image} alt={item.title} className="w-full h-48 object-cover mb-6" />
                        <h3 className="text-xl font-bold text-gray-800 mb-3 px-4">{item.title}</h3>
                        <p className="text-gray-600 mb-6 px-4">{item.text}</p>
                        {item.buttonText && (
                          <a href={item.buttonLink || '#'} className="inline-block border-2 border-gray-200 text-gray-600 font-bold px-6 py-2 rounded hover:border-[#e97770] hover:text-[#e97770] transition">
                            {item.buttonText}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === 'gallery') {
            return (
              <section key={block.id} className={`py-20 px-6 bg-gray-50 ${customClasses}`} style={sectionStyle}>
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">{block.content.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {block.content.images?.map((image, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-lg shadow-md">
                        <img src={image.url} alt={image.caption || `Gallery image ${i+1}`} className="w-full h-64 object-cover group-hover:scale-105 transition duration-300" />
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
          }

          if (block.type === 'testimonials') {
            return (
              <section key={block.id} className={`py-20 px-6 bg-white ${customClasses}`} style={sectionStyle}>
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">{block.content.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {block.content.testimonials?.map((testimonial, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          {testimonial.avatar && (
                            <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                            <p className="text-sm text-gray-500">{testimonial.role}</p>
                          </div>
                        </div>
                        <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === 'contact') {
            return (
              <section key={block.id} className={`py-20 px-6 bg-gray-900 text-white ${customClasses}`} style={sectionStyle}>
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl font-bold mb-4">{block.content.title}</h2>
                  <p className="text-xl text-gray-300 mb-12">{block.content.subtitle}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {block.content.email && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Email</h3>
                        <a href={`mailto:${block.content.email}`} className="text-blue-400 hover:text-blue-300">{block.content.email}</a>
                      </div>
                    )}
                    
                    {block.content.phone && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Phone</h3>
                        <a href={`tel:${block.content.phone}`} className="text-blue-400 hover:text-blue-300">{block.content.phone}</a>
                      </div>
                    )}
                    
                    {block.content.address && (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <h3 className="font-semibold mb-2">Address</h3>
                        <p className="text-gray-300">{block.content.address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === 'video') {
            // Extract video ID from URL
            let videoId = '';
            let embedUrl = '';
            
            if (block.content.videoUrl) {
              const youtubeMatch = block.content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
              const vimeoMatch = block.content.videoUrl.match(/vimeo\.com\/(\d+)/);
              
              if (youtubeMatch) {
                videoId = youtubeMatch[1];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
              } else if (vimeoMatch) {
                videoId = vimeoMatch[1];
                embedUrl = `https://player.vimeo.com/video/${videoId}`;
              }
            }

            return (
              <section key={block.id} className={`py-20 px-6 bg-gray-50 ${customClasses}`} style={sectionStyle}>
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">{block.content.title}</h2>
                  {block.content.description && (
                    <p className="text-xl text-gray-600 mb-12">{block.content.description}</p>
                  )}
                  
                  {embedUrl ? (
                    <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        src={embedUrl}
                        title={block.content.title}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-200 rounded-lg p-12 text-gray-500">
                      Add a YouTube or Vimeo URL to display the video
                    </div>
                  )}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>
      
      {/* Footer Area */}
      <footer className="bg-[#2b252c] text-gray-400 py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="mb-6">&copy; {new Date().getFullYear()} {pageData.title}. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a href="#" className="hover:text-white transition">Twitter</a>
            <a href="#" className="hover:text-white transition">Facebook</a>
            <a href="#" className="hover:text-white transition">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
