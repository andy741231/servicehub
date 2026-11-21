/**
 * Rich-text + URL helpers used by the public site renderer (and therefore by
 * the editor canvas, which renders the same components). Behavior is copied
 * verbatim from the original pages/public/Home.jsx so published pages render
 * exactly as before.
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// GFM + line-break support, links open in new tab safely
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

const SANITIZE_OPTS = {
  ALLOWED_TAGS: ['p','br','strong','em','b','i','u','s','strike','del','ins','sub','sup','small','mark','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img','span','font','div'],
  ALLOWED_ATTR: ['href','title','target','rel','src','alt','class','style','face','size','color','align'],
};

const HTML_TAG_RE = /<(?:p|span|strong|em|b|i|u|s|strike|del|h[1-6]|ul|ol|blockquote|a|font)(?:\s|>)/i;

/** Field value (HTML from inline editing, or lightweight markdown) → safe HTML. */
export const renderRichText = (value) => {
  const source = value || '';
  const html = HTML_TAG_RE.test(source) ? source : marked.parse(source);
  return DOMPurify.sanitize(html, SANITIZE_OPTS);
};

/**
 * Same as renderRichText but without a wrapping <p> for markdown input — what
 * an inline contentEditable inside a heading/span should start from.
 */
export const renderInlineRichText = (value) => {
  const source = value || '';
  const html = HTML_TAG_RE.test(source) ? source : marked.parseInline(source, { breaks: true });
  return DOMPurify.sanitize(html, SANITIZE_OPTS);
};

/** dangerouslySetInnerHTML helper; undefined for empty so React renders nothing. */
export const rt = (value) => {
  const html = renderRichText(value);
  return html ? { __html: html } : undefined;
};

export const buttonClass = (variant = 'gold') =>
  `public-slider-button public-slider-button--${['gold', 'outline', 'default'].includes(variant) ? variant : 'gold'}`;

export const resolveUrl = (url) => {
  if (!url) return '';
  url = url.replace(/['"]/g, ''); // Strip quotes
  // Convert same-origin absolute URLs to relative paths
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === window.location.hostname) return parsed.pathname + parsed.search + parsed.hash;
    } catch { /* fall through */ }
    return url;
  }
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
};
