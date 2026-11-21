/**
 * Editable implementations of the site field components (src/site/fields.jsx).
 *
 * The editor renders blocks with the SAME components as the public site
 * (src/site/SiteBlock.jsx) and provides these through SiteEditContext, so
 * text/images/links become editable in place while the surrounding markup,
 * classes and theme stay identical to what visitors see.
 */
import { useMemo } from 'react';
import { Plus, Link2 } from 'lucide-react';
import { SiteEditContext, useSiteEdit } from '../../../site/fields';
import { renderRichText } from '../../../site/siteRichText';
import InlineTextEditor from './InlineTextEditor';
import EditableImage from './EditableImage';

// ── Path helpers ("items.2.label") ─────────────────────────────────────────
const splitPath = (path) => path.split('.').map((k) => (/^\d+$/.test(k) ? Number(k) : k));

export function getPath(obj, path) {
  return splitPath(path).reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function setIn(obj, keys, value) {
  const [k, ...rest] = keys;
  const base = obj ?? (typeof k === 'number' ? [] : {});
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[k] = rest.length ? setIn(base[k], rest, value) : value;
  return copy;
}

/** Top-level content update ({ key: newValue }) for setting `path` to `value`. */
export function contentUpdateForPath(content, path, value) {
  const keys = splitPath(path);
  const top = keys[0];
  return { [top]: keys.length === 1 ? value : setIn(content?.[top], keys.slice(1), value) };
}

// ── Value conversion ───────────────────────────────────────────────────────
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** contentEditable HTML → plain text (line breaks preserved as \n). */
export function htmlToPlain(html) {
  const withBreaks = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>\s*<(div|p)[^>]*>/gi, '\n')
    .replace(/<(div|p)[^>]*>/gi, '\n');
  const el = document.createElement('div');
  el.innerHTML = withBreaks;
  return (el.textContent || '').replace(/^\n+/, '').replace(/\n+$/, '');
}

// Plain values render as text on the site, where a stored newline collapses to
// a space — so keep it as a literal newline (not <br>) to look identical.
const plainToHtml = (s) => escapeHtml(String(s || ''));

// ── Field implementations ──────────────────────────────────────────────────
function EditText({ as: Tag, path, value, className, style, placeholder, multiline, plain, prefix, suffix, toolbar }) {
  const { update, startEditing, endEditing } = useSiteEdit();
  // Exactly the HTML the public site renders (src/site/fields.jsx), so the
  // field looks the same while editing as it does on the published page.
  // (trim: marked appends "\n" after </p>, which would become a stray text
  // node outside the paragraph where End/typing lands.)
  const html = plain ? plainToHtml(value) : renderRichText(value).trim();
  const onChange = (next) => update(path, plain ? htmlToPlain(next) : next);
  const wrapped = !!(prefix || suffix);
  const editor = (
    <InlineTextEditor
      tag={wrapped ? 'span' : Tag}
      content={html}
      onChange={onChange}
      onEditingStart={startEditing}
      onEditingEnd={endEditing}
      placeholder={placeholder}
      multiline={multiline}
      // plain → no formatting (it would be dropped on save); long-form text →
      // headings/lists; everything else → bold/italic/link.
      toolbar={plain ? 'none' : (toolbar || 'inline')}
      className={wrapped ? '' : (className || '')}
      style={wrapped ? undefined : style}
    />
  );
  // Decorations (quote marks, "— ") stay outside the editable text so they
  // are shown but never stored.
  if (wrapped) return <Tag className={className} style={style}>{prefix}{editor}{suffix}</Tag>;
  return editor;
}

function EditImage({ path, value, alt, className }) {
  const { update, startEditing, endEditing } = useSiteEdit();
  return (
    <EditableImage
      src={value}
      alt={alt}
      className={className}
      onChange={(url) => update(path, url)}
      onRemove={() => update(path, '')}
      onEditingStart={startEditing}
      onEditingEnd={endEditing}
    />
  );
}

function EditLink({ textPath, hrefPath, text, href, className, after, placeholder }) {
  const { update, startEditing, endEditing } = useSiteEdit();
  const editHref = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = window.prompt('Link URL (https://…, /page, mailto:…):', href || '');
    if (next != null) update(hrefPath, next.trim());
  };
  return (
    <span className="site-edit-link">
      {/* preventDefault: clicking into the label must not follow the link */}
      <a href={href || '#'} className={className} onClick={(e) => e.preventDefault()}>
        <InlineTextEditor
          tag="span"
          content={plainToHtml(text)}
          onChange={(next) => update(textPath, htmlToPlain(next))}
          onEditingStart={startEditing}
          onEditingEnd={endEditing}
          placeholder={placeholder}
          toolbar="none"
        />
        {after}
      </a>
      <button
        type="button"
        className="site-edit-link-btn site-editor-chrome"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={editHref}
        title={`Link: ${href || '(none)'} — click to change`}
        aria-label="Edit link URL"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

function EditListAdd({ path, make, label }) {
  const { update, content } = useSiteEdit();
  return (
    <div className="site-editor-chrome flex justify-center py-3">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => update(path, [...(getPath(content, path) || []), make()])}
        className="site-edit-add"
      >
        <Plus className="w-3.5 h-3.5" /> {label}
      </button>
    </div>
  );
}

/**
 * Provides editable fields for one block.
 * @param onUpdateContent  receives a top-level content update object
 * @param onAddNestedBlock (colIndex) => void, for legacy grid blocks
 */
export function SiteEditProvider({ content, onUpdateContent, onEditingStart, onEditingEnd, onAddNestedBlock, children }) {
  const value = useMemo(() => ({
    Text: EditText,
    Image: EditImage,
    Link: EditLink,
    ListAdd: EditListAdd,
    NestedAdd: onAddNestedBlock
      ? ({ colIndex }) => (
        <div className="site-editor-chrome py-2">
          <button type="button" className="site-edit-add w-full justify-center" onMouseDown={(e) => e.stopPropagation()} onClick={() => onAddNestedBlock(colIndex)}>
            <Plus className="w-3.5 h-3.5" /> Add block
          </button>
        </div>
      )
      : null,
    content,
    update: (path, v) => onUpdateContent(contentUpdateForPath(content, path, v)),
    startEditing: onEditingStart,
    endEditing: onEditingEnd,
  }), [content, onUpdateContent, onEditingStart, onEditingEnd, onAddNestedBlock]);
  return <SiteEditContext.Provider value={value}>{children}</SiteEditContext.Provider>;
}
