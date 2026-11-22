/**
 * Editable implementations of the site field components (src/site/fields.jsx).
 *
 * The editor renders blocks with the SAME components as the public site
 * (src/site/SiteBlock.jsx) and provides these through SiteEditContext, so
 * text/images/links become editable in place while the surrounding markup,
 * classes and theme stay identical to what visitors see.
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, Link2, Check, X } from 'lucide-react';
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
  const wrapped = !!(prefix || suffix);
  let html = plain ? plainToHtml(value) : renderRichText(value).trim();
  // Decorated fields (quote marks) render inline on the site: `“text”` is one
  // paragraph. Editing a lone <p> inside the decoration's <span> put each mark
  // on its own line (and made the block jump in height when editing ended).
  if (wrapped && !plain) {
    const single = html.match(/^<p>([\s\S]*)<\/p>$/);
    if (single && !/<\/?p[\s>]/i.test(single[1])) html = single[1];
  }
  const onChange = (next) => update(path, plain ? htmlToPlain(next) : next);
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

function EditImage({ path, value, alt, className, style, wrapperClassName }) {
  const { update, startEditing, endEditing } = useSiteEdit();
  return (
    <EditableImage
      src={value}
      alt={alt}
      className={className}
      style={style}
      wrapperClassName={wrapperClassName}
      onChange={(url) => update(path, url)}
      onRemove={() => update(path, '')}
      onEditingStart={startEditing}
      onEditingEnd={endEditing}
    />
  );
}

function isSafeHref(raw) {
  const url = raw.trim();
  if (!url) return true; // empty clears the link
  if (url.startsWith('/') || url.startsWith('#')) return true;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return true;
  return !url.includes(':');
}

function EditLink({ textPath, hrefPath, text, href, className, after, placeholder }) {
  const { update, startEditing, endEditing } = useSiteEdit();
  const [editingHref, setEditingHref] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const popRef = useRef(null);
  const inputRef = useRef(null);

  const openHref = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(href || '');
    setError('');
    setEditingHref(true);
    startEditing?.();
  };

  const closeHref = () => {
    setEditingHref(false);
    setError('');
    endEditing?.();
  };

  const saveHref = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = draft.trim();
    if (!isSafeHref(trimmed)) {
      setError('Use https://, /page, #section, or mailto:');
      return;
    }
    update(hrefPath, trimmed);
    closeHref();
  };

  useEffect(() => {
    if (!editingHref) return undefined;
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    const doc = popRef.current?.ownerDocument || document;
    const onDown = (e) => {
      if (popRef.current?.contains(e.target)) return;
      closeHref();
    };
    doc.addEventListener('mousedown', onDown, true);
    if (doc !== document) document.addEventListener('mousedown', onDown, true);
    return () => {
      doc.removeEventListener('mousedown', onDown, true);
      if (doc !== document) document.removeEventListener('mousedown', onDown, true);
    };
  }, [editingHref]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="site-edit-link relative inline-flex items-center">
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
        onClick={openHref}
        title={`Link: ${href || '(none)'} — click to change`}
        aria-label="Edit link URL"
        aria-expanded={editingHref}
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
      {editingHref && (
        <form
          ref={popRef}
          onSubmit={saveHref}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="site-editor-chrome absolute left-0 top-full mt-2 z-[2500] bg-[#181b22] text-white rounded-lg shadow-xl p-2 flex flex-col gap-1 min-w-[260px]"
          role="dialog"
          aria-label="Edit link URL"
        >
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeHref(); } }}
              placeholder="https://…, /page, mailto:…"
              aria-label="Link URL"
              className="flex-1 bg-white/10 text-white placeholder-white/40 text-xs px-2 py-1.5 rounded border border-white/15 focus:outline-none focus:border-primary"
            />
            <button type="submit" title="Apply link" aria-label="Apply link" className="w-7 h-7 rounded bg-primary text-white flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={closeHref} title="Cancel" aria-label="Cancel link edit" className="w-7 h-7 rounded hover:bg-white/10 text-white/70 flex items-center justify-center shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {error && <span className="text-[11px] text-red-400 px-1">{error}</span>}
        </form>
      )}
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
