/**
 * Site header + footer, shared by the public site and the editor canvas.
 * Ported 1:1 from the original pages/public/Home.jsx.
 */
import { useEffect, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { resolveUrl } from './siteRichText';

/**
 * @param currentPath  path used to highlight the active nav item
 *                     (defaults to the browser location)
 * @param sticky       false in the editor so the header doesn't stick over
 *                     the editor toolbar
 */
export function SiteHeader({ pageData, currentPath = window.location.pathname, sticky = true }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const header     = pageData.header || {};
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
        className={`${sticky ? 'sticky top-0 z-50' : 'relative'} transition-all duration-200 ${
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
}

export function SiteFooter({ pageData }) {
  const header    = pageData.header || {};
  const footer    = pageData.footer || {};
  const sections  = footer?.sections || [];
  const copyright = footer?.copyright || `&copy; ${new Date().getFullYear()} ${pageData.title}. All rights reserved.`;
  const fStyle    = { backgroundColor: footer?.styles?.backgroundColor, color: footer?.styles?.textColor };
  const nav       = pageData.nav?.length ? pageData.nav : (header?.navigation || []);

  const logoText = header?.logo?.text || pageData.title || '';
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
}
