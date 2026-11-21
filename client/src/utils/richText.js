/**
 * Shared rich-text rendering for public pages and the editor canvas.
 * Accepts HTML (from inline contentEditable fields) or lightweight markdown
 * (what form/textarea fields produce: *italic*, **bold**, and real newlines
 * which become <br> via marked's breaks option).
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

const HTML_TAG_RE = /<(?:p|span|strong|em|b|i|u|s|strike|del|h[1-6]|ul|ol|blockquote|a|font)(?:\s|>)/i;

const SANITIZE_OPTS = {
  ALLOWED_TAGS: ['p','br','strong','em','b','i','u','s','strike','del','ins','sub','sup','small','mark','a','ul','ol','li','blockquote','code','pre','h1','h2','h3','h4','h5','h6','hr','img','span','font','div'],
  ALLOWED_ATTR: ['href','title','target','rel','src','alt','class','style','face','size','color','align'],
};

export const renderRichText = (value) => {
  const source = value || '';
  const html = HTML_TAG_RE.test(source)
    ? source
    : marked.parseInline(source, { breaks: true });
  return DOMPurify.sanitize(html, SANITIZE_OPTS);
};

// Helper for rendering a rich-text field as HTML inside an existing element.
// Returns a dangerouslySetInnerHTML object, or undefined for empty values so
// React renders nothing instead of an empty wrapper.
export const rt = (value) => {
  const html = renderRichText(value);
  return html ? { __html: html } : undefined;
};

/**
 * Resolve a button variant to CSS classes. Site-tier names (primary,
 * secondary, tertiary) map to the token-driven `public-button` system;
 * legacy names (gold, outline, default) keep their fixed `public-slider-button`
 * styling for backward compatibility.
 */
export const buttonClass = (variant = 'primary') =>
  ['primary', 'secondary', 'tertiary'].includes(variant)
    ? `public-button public-button--${variant}`
    : `public-slider-button public-slider-button--${['gold', 'outline', 'default'].includes(variant) ? variant : 'gold'}`;
