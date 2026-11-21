import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { Globe, FileX } from 'lucide-react';
import { resolveSiteTokens, siteThemeStyle, useSiteFonts } from '../../site/siteTheme';
import { SiteHeader, SiteFooter } from '../../site/SiteChrome';
import SiteSections from '../../site/SiteSections';

/**
 * Public site page. Rendering lives in src/site/ (shared with the web
 * editor's canvas so what you edit is what visitors see); this component
 * only loads the page, handles the empty/draft states and applies the theme.
 */
export default function PublicHome({ previewData = null, previewMode = false }) {
  const { slug } = useParams();           // undefined on /, set on /:slug

  const [loading,        setLoading]        = useState(!previewMode);
  const [pageData,       setPageData]       = useState(null);
  const [draftTemplates, setDraftTemplates] = useState(null);

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

  const siteTokens = resolveSiteTokens(pageData?.siteStyle);
  useSiteFonts(siteTokens, !!pageData);

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

  return (
    <div className="public-site min-h-screen bg-surface text-text-base" style={siteThemeStyle(siteTokens)}>
      <SiteHeader pageData={pageData} />
      <main id="main-content" role="main"><SiteSections pageData={pageData} /></main>
      <SiteFooter pageData={pageData} />
    </div>
  );
}
