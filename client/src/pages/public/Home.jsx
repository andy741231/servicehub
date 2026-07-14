import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import api from '../../utils/api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Globe, Star, Image as ImageIcon, Check, Settings, MessageCircle, RefreshCw, Wrench, ChevronDown, Menu, X, FileX } from 'lucide-react';

// Configure marked: GFM + line-break support, links open in new tab safely
marked.use({
  gfm: true,
  breaks: true,
  renderer: (() => {
    const r = new marked.Renderer();
    r.link = ({ href, title, tokens }) => {
      const text = tokens.map(t => t.raw ?? '').join('');
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    return r;
  })(),
});

const renderMarkdown = (md) =>
  DOMPurify.sanitize(marked.parse(md || ''), {
    ALLOWED_TAGS: ['p','br','strong','em','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img','span'],
    ALLOWED_ATTR: ['href','title','target','rel','src','alt','class'],
  });

const buttonClass = (variant = 'gold') => `public-slider-button public-slider-button--${['gold', 'outline', 'default'].includes(variant) ? variant : 'gold'}`;

const renderRichText = (value) => {
  const source = value || '';
  const html = /<(?:p|span|strong|em|h[1-6]|ul|ol|blockquote|a)(?:\s|>)/i.test(source)
    ? source
    : marked.parse(source);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p','br','strong','em','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img','span'],
    ALLOWED_ATTR: ['href','title','target','rel','src','alt','class'],
  });
};

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

const DEFAULT_SITE_TOKENS = {
  colors: {
    primary: '#152b45', secondary: '#54738e', accent: '#b08a4a',
    background: '#f8f6f1', text: '#152b45', muted: '#647384',
  },
  fonts: {
    heading: 'DM Sans, sans-serif', body: 'DM Sans, sans-serif',
    serif: 'Libre Baskerville, Georgia, serif',
  },
  spacing: { base: 16 },
  borderRadius: { default: 5 },
};

const hexToHsl = (hex) => {
  const value = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const fontFamilyUrl = (font) => {
  const family = String(font || '').split(',')[0].trim();
  return family ? family.replace(/ /g, '+') : '';
};

const extractVideoId = (value, provider) => {
  const source = String(value || '').trim();
  if (/^[\w-]+$/.test(source)) return source;
  const patterns = provider === 'youtube'
    ? [/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/i]
    : [/(?:vimeo\.com\/|video\/)(\d+)/i];
  return patterns.map(pattern => source.match(pattern)?.[1]).find(Boolean) || '';
};

const renderSlideBackground = (slide) => {
  const type = slide.backgroundType || 'color';
  if (type === 'video' && slide.videoUrl) {
    return <video className="public-slider-background" autoPlay muted loop playsInline poster={resolveUrl(slide.posterImage)}><source src={resolveUrl(slide.videoUrl)} /></video>;
  }
  if (type === 'youtube' && slide.youtubeId) {
    const id = extractVideoId(slide.youtubeId, 'youtube');
    return id ? <iframe className="public-slider-background public-slider-embed" src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&rel=0&playsinline=1`} title="Slider background video" allow="autoplay; encrypted-media" /> : null;
  }
  if (type === 'vimeo' && slide.vimeoId) {
    const id = extractVideoId(slide.vimeoId, 'vimeo');
    return id ? <iframe className="public-slider-background public-slider-embed" src={`https://player.vimeo.com/video/${id}?background=1&autoplay=1&loop=1&muted=1`} title="Slider background video" allow="autoplay; fullscreen; picture-in-picture" /> : null;
  }
  return null;
};

export default function PublicHome({ previewData = null, previewMode = false }) {
  const { slug } = useParams();           // undefined on /, set on /:slug

  const [loading,        setLoading]        = useState(!previewMode);
  const [pageData,       setPageData]       = useState(null);
  const [draftTemplates, setDraftTemplates] = useState(null);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [scrolled,       setScrolled]       = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!pageData || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.public-site .public-reveal').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [pageData]);

  useEffect(() => {
    if (previewMode && previewData) {
      setPageData(previewData);
      setLoading(false);
      return;
    }
    const pageSlug = slug || 'home';
    api.get(`/web/${pageSlug}`)
      .then(({ data }) => setPageData(data))
      .catch(async () => {
        try {
          const { data } = await api.get('/web/draft-templates');
          setDraftTemplates(data);
        } catch (e) {
          console.error('Failed to fetch draft templates:', e);
        }
      })
      .finally(() => setLoading(false));
  }, [previewMode, previewData, slug]);

  const siteTokens = {
    colors: { ...DEFAULT_SITE_TOKENS.colors, ...(pageData?.siteStyle?.tokens?.colors || {}) },
    fonts: { ...DEFAULT_SITE_TOKENS.fonts, ...(pageData?.siteStyle?.tokens?.fonts || {}) },
    spacing: { ...DEFAULT_SITE_TOKENS.spacing, ...(pageData?.siteStyle?.tokens?.spacing || {}) },
    borderRadius: { ...DEFAULT_SITE_TOKENS.borderRadius, ...(pageData?.siteStyle?.tokens?.borderRadius || {}) },
  };

  useEffect(() => {
    if (!pageData) return undefined;
    const families = [...new Set([siteTokens.fonts.heading, siteTokens.fonts.body, siteTokens.fonts.serif]
      .map(fontFamilyUrl)
      .filter(Boolean))];
    if (!families.length) return undefined;
    const id = 'public-site-fonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&')}&display=swap`;
    return undefined;
  }, [pageData, siteTokens.fonts.heading, siteTokens.fonts.body, siteTokens.fonts.serif]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <Globe className="w-12 h-12 text-primary mb-4" />
          <div className="h-4 bg-surface-tertiary rounded w-32" />
        </div>
      </div>
    );
  }

  if (!pageData) {
    const isHome = !slug || slug === 'home';
    if (draftTemplates) {
      if (isHome) {
        const t = draftTemplates.homeDraft;
        return (
          <div
            className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-16"
            style={{ backgroundColor: t.bgColor, color: t.textColor }}
          >
            {t.showLogo && (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl mb-6"
                style={{ backgroundColor: t.accentColor }}
              >
                {(t.logoText || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: t.accentColor }} />
            <h1 className="text-4xl font-bold mb-4" style={{ color: t.textColor }}>
              {t.heading}
            </h1>
            <p className="text-lg max-w-xl mx-auto opacity-70" style={{ color: t.textColor }}>
              {t.message}
            </p>
            {t.showContactEmail && t.contactEmail && (
              <a
                href={`mailto:${t.contactEmail}`}
                className="mt-6 text-sm underline opacity-80"
                style={{ color: t.accentColor }}
              >
                {t.contactEmail}
              </a>
            )}
          </div>
        );
      } else {
        const t = draftTemplates.pageDraft;
        return (
          <div
            className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-16"
            style={{ backgroundColor: t.bgColor, color: t.textColor }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: t.accentColor + '18' }}
            >
              <FileX className="w-10 h-10" style={{ color: t.accentColor }} />
            </div>
            <h1 className="text-4xl font-bold mb-4" style={{ color: t.textColor }}>
              {t.heading}
            </h1>
            <p className="text-lg max-w-xl mx-auto opacity-70" style={{ color: t.textColor }}>
              {t.message}
            </p>
            {t.showBackLink && (
              <a
                href={t.backLinkHref || '/'}
                className="mt-8 text-sm font-medium underline"
                style={{ color: t.accentColor }}
              >
                {t.backLinkLabel || 'Go back home'}
              </a>
            )}
          </div>
        );
      }
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 bg-background">
        <h1 className="text-3xl font-bold text-text-base mb-4">Page Not Found</h1>
        <p className="text-subtle mb-8">The page you&#39;re looking for doesn&#39;t exist.</p>
        {!previewMode && <a href="/" className="text-primary hover:underline">Go home</a>}
      </div>
    );
  }

  const header = pageData.header || {};
  const footer = pageData.footer || {};

  // ── Helpers ──────────────────────────────────────────────────────────────

  const currentPath = window.location.pathname;

  const renderHeader = () => {
    const logoText   = header?.logo?.text ?? pageData.title;
    const logoImage  = resolveUrl(header?.logo?.imageUrl);
    const logoWidth  = header?.logo?.width;
    const logoHeight = header?.logo?.height;
    const nav        = pageData.nav?.length ? pageData.nav : (header?.navigation || []);
    const cta        = header?.cta;
    const hasBg      = header?.styles?.backgroundColor;
    const hStyle     = hasBg
      ? { backgroundColor: header.styles.backgroundColor, color: header.styles.textColor }
      : {};

    const logoStyle = {
      width:  logoWidth  ? `${logoWidth}px`  : 'auto',
      height: logoHeight ? `${logoHeight}px` : '32px',
      padding: `${header?.logo?.padding?.top ?? 0}px ${header?.logo?.padding?.right ?? 0}px ${header?.logo?.padding?.bottom ?? 0}px ${header?.logo?.padding?.left ?? 0}px`,
      margin: `${header?.logo?.margin?.top ?? 0}px ${header?.logo?.margin?.right ?? 0}px ${header?.logo?.margin?.bottom ?? 0}px ${header?.logo?.margin?.left ?? 0}px`,
    };

    const isActive = (href) => {
      if (!href) return false;
      if (href === '/') return currentPath === '/';
      return currentPath.startsWith(href);
    };

    return (
      <>
        <header
          className={`sticky top-0 z-50 transition-all duration-200 ${
            hasBg ? '' : scrolled
              ? 'bg-surface/90 backdrop-blur-md shadow-sm border-b border-border-soft'
              : 'bg-surface/80 backdrop-blur-sm border-b border-border-soft/60'
          }`}
          style={hStyle}
        >
          <div
            className="public-container flex items-center justify-between max-w-7xl mx-auto px-6"
            style={{ minHeight: '82px' }}
          >
            {/* Logo */}
            <a
              href="/"
              className="public-brand flex items-center gap-3 font-bold text-sm shrink-0 hover:opacity-75 transition-opacity"
              style={hasBg ? {} : { color: 'inherit' }}
            >
              {logoImage
                ? <img src={logoImage} alt={logoText} className="object-contain" style={logoStyle} />
                : <span className="public-brand-mark" aria-hidden="true">{(logoText || 'H').charAt(0).toUpperCase()}</span>}
              <span className="leading-tight tracking-wide">{logoText}<small className="public-brand-subtitle">{header?.logo?.subtitle || 'Your City, USA'}</small></span>
            </a>

            {/* Desktop nav */}
            {nav.length > 0 && (
              <nav className="hidden md:flex items-center gap-1">
                {nav.map((item, i) => {
                  const active = isActive(item.href);
                  if (item.children?.length) {
                    return (
                      <div key={i} className="relative group">
                        <button
                          className={`public-nav-link flex items-center gap-1 px-3.5 py-2 text-sm font-medium transition-colors ${
                            active
                              ? 'text-primary bg-primary-light'
                              : 'text-muted hover:text-text-base hover:bg-surface-raised'
                          }`}
                        >
                          {item.label}
                          <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform duration-200" />
                        </button>
                        <div className="absolute left-0 top-full hidden group-hover:block pt-1">
                          <div className="bg-surface rounded-xl shadow-xl border border-border-soft py-1.5 min-w-[180px] overflow-hidden">
                            {item.children.map((child, ci) => (
                              <a
                                key={ci}
                                href={child.href || '#'}
                                className="flex items-center px-4 py-2.5 text-sm text-muted hover:bg-surface-raised hover:text-primary transition-colors"
                              >
                                {child.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <a
                      key={i}
                      href={item.href || '#'}
                      className={`public-nav-link px-3.5 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'text-primary bg-primary-light'
                          : 'text-muted hover:text-text-base hover:bg-surface-raised'
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            )}

            {cta?.text && (
              <a href={cta.href || '#'} className="public-header-cta hidden md:inline-flex">
                {cta.text}<span aria-hidden="true">→</span>
              </a>
            )}

            {/* Mobile hamburger */}
            {nav.length > 0 && (
              <button
                className="md:hidden p-2 rounded-lg text-subtle hover:bg-surface-raised transition"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>

          {/* Mobile drawer */}
          {mobileOpen && nav.length > 0 && (
            <div className="md:hidden border-t border-border-soft bg-surface px-4 pb-4 pt-2 space-y-1">
              {nav.map((item, i) => (
                <div key={i}>
                  <a
                    href={item.href || '#'}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'text-primary bg-primary-light'
                        : 'text-muted hover:bg-surface-raised'
                    }`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                  {item.children?.map((child, ci) => (
                    <a
                      key={ci}
                      href={child.href || '#'}
                      className="block pl-8 py-2 text-sm text-subtle hover:text-text-base hover:bg-surface-raised rounded-lg transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
        </header>
      </>
    );
  };

  const renderFooter = () => {
    const sections  = footer?.sections || [];
    const copyright = footer?.copyright || `&copy; ${new Date().getFullYear()} ${pageData.title}. All rights reserved.`;
    const fStyle    = { backgroundColor: footer?.styles?.backgroundColor, color: footer?.styles?.textColor };

    const logoText = header?.logo?.text || pageData.title;
    const linkSections = sections.filter(section => section.type === 'links');
    const infoSection = sections.find(section => section.type === 'contact-info');
    const textSection = sections.find(section => section.type === 'text');

    return (
      <footer className="public-footer border-t py-14 px-6" style={fStyle}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10">
            <div>
              <a href="/" className="public-brand flex items-center gap-3 font-bold text-sm">
                <span className="public-brand-mark" aria-hidden="true">{logoText.charAt(0).toUpperCase()}</span>
                <span className="leading-tight tracking-wide">{logoText}<small className="public-brand-subtitle">{header?.logo?.subtitle || 'Your City, USA'}</small></span>
              </a>
              <p className="mt-5 max-w-xs text-sm opacity-75">{textSection?.content || 'A local church for a changing city.'}</p>
            </div>
            <div className="public-footer-links">
              {linkSections.flatMap(section => section.links || []).map((link, i) => (
                <a key={i} href={link.href || '#'}>{link.label}</a>
              ))}
              {!linkSections.length && nav.map((item, i) => <a key={i} href={item.href || '#'}>{item.label}</a>)}
            </div>
            <div className="text-sm opacity-80">
              {infoSection?.title && <strong className="block mb-3">{infoSection.title}</strong>}
              {infoSection?.address && <p>{infoSection.address}</p>}
              {infoSection?.phone && <p>{infoSection.phone}</p>}
              {infoSection?.email && <p>{infoSection.email}</p>}
              {!infoSection && <p>Sunday gatherings<br />9:00 AM · 11:00 AM</p>}
            </div>
          </div>
          <div className="public-footer-bottom border-t pt-5 flex flex-wrap justify-between gap-3 text-xs opacity-70">
            <span dangerouslySetInnerHTML={{ __html: copyright }} />
            <span>{footer?.tagline || 'Made for belonging.'}</span>
          </div>
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
      const cc = `${cs.className || ''} public-reveal`;

      if (block.type === 'slider') {
        const slider = block.content || {};
        const slides = slider.slides || [];
        const sliderHeight = slider.height || 'large';
        return (
          <section key={block.id} className={`public-slider public-slider--${sliderHeight} ${cc}`} style={sStyle} aria-label="Featured slides">
            <Swiper
              modules={[Autoplay, EffectFade, Navigation, Pagination]}
              effect={slider.transition === 'fade' ? 'fade' : 'slide'}
              speed={slider.transition === 'none' ? 0 : 650}
              loop={slides.length > 1}
              autoplay={slider.autoplay !== false && slides.length > 1 ? { delay: slider.interval || 6000, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
              navigation={slider.showArrows !== false && slides.length > 1}
              pagination={slider.showDots !== false && slides.length > 1 ? { clickable: true } : false}
            >
              {slides.map((slide, index) => {
                const backgroundStyle = slide.backgroundType === 'image' && slide.backgroundImage
                  ? { backgroundImage: `url(${resolveUrl(slide.backgroundImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : slide.backgroundType === 'gradient'
                    ? { background: slide.gradient || 'linear-gradient(135deg, #152b45, #54738e)' }
                    : { backgroundColor: slide.backgroundColor || '#152b45' };
                const align = slide.textAlign || 'left';
                return (
                  <SwiperSlide key={slide.id || index}>
                    <div className="relative h-full min-h-inherit" style={backgroundStyle}>
                      {renderSlideBackground(slide)}
                      {slide.overlay && slide.overlay !== 'none' && <div className={`public-slider-overlay public-slider-overlay--${slide.overlay}`} />}
                      <div className={`public-slider-content public-slider-content--${slide.verticalAlign || 'center'} public-slider-content--${align}-align`}>
                        {slide.eyebrow && <div className="public-slider-eyebrow" dangerouslySetInnerHTML={{ __html: renderRichText(slide.eyebrow) }} />}
                        {slide.title && <div className="public-slider-title" dangerouslySetInnerHTML={{ __html: renderRichText(slide.title) }} />}
                        {slide.subtitle && <div className="public-slider-subtitle" dangerouslySetInnerHTML={{ __html: renderRichText(slide.subtitle) }} />}
                        {slide.buttonText && <div className="public-slider-actions"><a href={slide.buttonLink || '#'} className={buttonClass(slide.buttonVariant)}>{slide.buttonText}<span aria-hidden="true">→</span></a></div>}
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </section>
        );
      }

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
            className="prose prose-lg max-w-none prose-headings:font-bold prose-p:mb-4 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: renderRichText(block.content.content) }}
          />
        </section>
      );

      if (block.type === 'trust-bar') return (
        <section key={block.id} className={`public-trust-bar ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(block.content.items || []).map((item, index) => <div key={index} className="public-trust-item"><strong>{item.number}</strong><span>{item.label}</span></div>)}
          </div>
        </section>
      );

      if (block.type === 'split-banner') return (
        <section key={block.id} className={`public-split-banner ${cc}`} style={sStyle}>
          <div><div className="public-eyebrow">{block.content.eyebrow}</div><h2>{block.content.title}</h2><p>{block.content.body}</p>{block.content.buttonText && <a href={block.content.buttonLink || '#'} className={buttonClass(block.content.buttonVariant)}>{block.content.buttonText}<span aria-hidden="true">→</span></a>}</div>
          <div className="public-service-times">{(block.content.times || []).map((time, index) => <div key={index}><strong>{time.label}</strong><span>{time.value}</span></div>)}</div>
        </section>
      );

      if (block.type === 'events') return (
        <section key={block.id} className={`py-20 px-6 ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto"><div className="public-section-heading"><div className="public-eyebrow">{block.content.eyebrow}</div><h2>{block.content.title}</h2></div><div className="public-events">{(block.content.items || []).map((item, index) => <div className="public-event" key={index}><span className="public-event-date">{item.date}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><span className="public-event-time">{item.time}</span></div>)}</div></div>
        </section>
      );

      if (block.type === 'quote') return (
        <section key={block.id} className={`public-quote ${cc}`} style={{ ...sStyle, backgroundColor: block.content.backgroundColor || '#eadfc9' }}><div className="max-w-6xl mx-auto px-6"><blockquote>“{block.content.quote}”</blockquote><cite>— {block.content.citation}</cite></div></section>
      );

      if (block.type === 'map') return (
        <section key={block.id} className={`py-12 px-6 ${cc}`} style={sStyle}><div className="max-w-6xl mx-auto"><div className="public-map">{block.content.embedUrl ? <iframe src={block.content.embedUrl} title={block.content.address || 'Location map'} loading="lazy" /> : <span>{block.content.address || 'Add a location'}</span>}</div></div></section>
      );

      if (block.type === 'intro') return (
        <section key={block.id} className={`bg-primary text-primary-foreground py-20 text-center ${cc}`} style={sStyle}>
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl font-bold mb-4">{block.content.title}</h2>
            <p className="text-xl mb-8 opacity-90">{block.content.content}</p>
            {block.content.buttonText && (
              <a href={block.content.buttonLink || '#'} className={buttonClass(block.content.buttonVariant || 'gold')}>
                {block.content.buttonText} <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </section>
      );

      if (block.type === 'features') return (
        <section key={block.id} className={`py-20 max-w-6xl mx-auto px-6 ${cc}`} style={sStyle}>
          <div className="text-center mb-16">
            {block.content.eyebrow && <div className="public-eyebrow mb-3">{block.content.eyebrow}</div>}
            <h2 className="text-3xl font-bold mb-2">{block.content.title}</h2>
            <p className="text-subtle">{block.content.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {block.content.items?.map((item, i) => {
              const IconComp = IconMap[item.icon] || Star;
              return (
                <div key={i} className={`public-feature-card public-feature-card--${item.variant || 'default'}`}>
                  <div className="w-14 h-14 bg-primary-light text-primary rounded-full flex items-center justify-center mb-5">
                    {block.content.numbered ? <span className="font-bold">{item.number || String(i + 1).padStart(2, '0')}</span> : <IconComp className="w-7 h-7" />}
                  </div>
                  <h3 className="text-xl font-bold text-text-base mb-3">{item.title}</h3>
                  <p className="text-muted leading-relaxed">{item.text || item.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      );

      if (block.type === 'highlights') return (
        <section key={block.id} className={`bg-surface-raised py-20 px-6 ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {block.content.items?.map((item, i) => (
                <div key={i} className="bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition pb-6 text-center">
                  <img src={item.image} alt={item.title} className="w-full h-48 object-cover mb-6" />
                  <h3 className="text-xl font-bold text-text-base mb-3 px-4">{item.title}</h3>
                  <p className="text-muted mb-6 px-4">{item.text}</p>
                  {item.buttonText && (
                    <a href={item.buttonLink || '#'} className={buttonClass(item.buttonVariant || 'outline')}>
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
        <section key={block.id} className={`py-20 px-6 bg-surface-raised ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {block.content.images?.map((image, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg shadow-md">
                  <img src={image.url} alt={image.caption || `Gallery ${i+1}`} className="w-full h-64 object-cover group-hover:scale-105 transition duration-300" />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-inverse text-sm">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

      if (block.type === 'testimonials') return (
        <section key={block.id} className={`py-20 px-6 bg-surface ${cc}`} style={sStyle}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{block.content.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {block.content.testimonials?.map((t, i) => (
                <div key={i} className="bg-surface-raised rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    {t.avatar && <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />}
                    <div>
                      <h4 className="font-semibold text-text-base">{t.name}</h4>
                      <p className="text-sm text-subtle">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-muted italic">"{t.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

      if (block.type === 'contact') return (
        <section key={block.id} className={`py-20 px-6 bg-surface-tertiary text-inverse ${cc}`} style={sStyle}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{block.content.title}</h2>
            <p className="text-xl text-subtle mb-12">{block.content.subtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {block.content.email && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">{block.content.emailLabel || 'Email'}</h3>
                  <a href={`mailto:${block.content.email}`} className="text-primary hover:text-primary-hover">{block.content.email}</a>
                </div>
              )}
              {block.content.phone && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">{block.content.phoneLabel || 'Phone'}</h3>
                  <a href={`tel:${block.content.phone}`} className="text-primary hover:text-primary-hover">{block.content.phone}</a>
                </div>
              )}
              {block.content.address && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <h3 className="font-semibold mb-2">{block.content.addressLabel || 'Address'}</h3>
                  <p className="text-subtle">{block.content.address}</p>
                </div>
              )}
            </div>
            {block.content.showForm && (
              <form className="public-contact-form mt-12 mx-auto max-w-2xl" onSubmit={event => event.preventDefault()}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input required placeholder="Your name" /><input required type="email" placeholder="Email address" /></div>
                <select required defaultValue="" aria-label="Reason for contacting us"><option value="" disabled>What can we help with?</option>{(block.content.reasonOptions || ['General question', 'Visit planning', 'Community care']).map(reason => <option key={reason}>{reason}</option>)}</select>
                <textarea rows="4" placeholder="Your message" />
                <button type="submit" className={buttonClass(block.content.buttonVariant || 'gold')}>Send message <span aria-hidden="true">→</span></button>
              </form>
            )}
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
          <section key={block.id} className={`py-20 px-6 bg-surface-raised ${cc}`} style={sStyle}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-text-base mb-4">{block.content.title}</h2>
              {block.content.description && <p className="text-xl text-muted mb-12">{block.content.description}</p>}
              {embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                  <iframe src={embedUrl} title={block.content.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div className="bg-surface-tertiary rounded-lg p-12 text-subtle">Add a YouTube or Vimeo URL to display the video</div>
              )}
            </div>
          </section>
        );
      }

      return null;
    });
  };

  // Render sections (new model) or fall back to legacy flat blocks
  const renderContent = () => {
    if (pageData.sections && pageData.sections.length > 0) {
      return pageData.sections.map((section, sIdx) => {
        const sectionStyle = {
          paddingTop:      section.paddingTop     ?? 0,
          paddingBottom:   section.paddingBottom  ?? 0,
          paddingLeft:     section.paddingLeft    ?? 0,
          paddingRight:    section.paddingRight   ?? 0,
          marginTop:       section.marginTop      ?? 0,
          marginBottom:    section.marginBottom   ?? 0,
          backgroundColor: section.backgroundColor || undefined,
        };

        return (
          <div key={section.id || sIdx} style={sectionStyle}>
            {section.columns > 1 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                  gap: `${section.gap ?? 24}px`,
                }}
              >
                {Array.from({ length: section.columns }).map((_, colIdx) => {
                  const colBlocks = (section.blocks || []).filter((_, bi) => bi % section.columns === colIdx);
                  return (
                    <div key={colIdx}>
                      {renderBlocks(colBlocks)}
                    </div>
                  );
                })}
              </div>
            ) : (
              renderBlocks(section.blocks || [])
            )}
          </div>
        );
      });
    }
    // Legacy: flat blocks directly on the page
    return renderBlocks(pageData.blocks || []);
  };

  const colorVars = Object.fromEntries([
    ['--primary', siteTokens.colors.primary],
    ['--primary-hover', siteTokens.colors.primary],
    ['--accent', siteTokens.colors.accent],
    ['--primary-light', siteTokens.colors.secondary],
    ['--primary-foreground', '#fffefa'],
    ['--background', siteTokens.colors.background],
    ['--surface', '#fffefa'],
    ['--surface-raised', siteTokens.colors.background],
    ['--surface-tertiary', siteTokens.colors.secondary],
    ['--border', '#d9dde0'],
    ['--border-soft', '#edf0f1'],
    ['--border-strong', '#cbd1d6'],
    ['--text-base', siteTokens.colors.text],
    ['--text-muted', siteTokens.colors.muted],
    ['--text-subtle', siteTokens.colors.muted],
    ['--text-inverse', '#fffefa'],
  ].map(([key, value]) => [key, hexToHsl(value) || value]));
  const publicStyle = {
    ...colorVars,
    '--font-heading': siteTokens.fonts.heading,
    '--font-body': siteTokens.fonts.body,
    '--font-serif': siteTokens.fonts.serif,
    '--space-base': `${siteTokens.spacing.base}px`,
    '--radius-base-value': `${siteTokens.borderRadius.default}px`,
    '--radius-card-value': `${siteTokens.borderRadius.default}px`,
  };

  return (
    <div className="public-site min-h-screen bg-surface text-text-base" style={publicStyle}>
      {renderHeader()}
      <main id="main-content" role="main">{renderContent()}</main>
      {renderFooter()}
    </div>
  );
}
