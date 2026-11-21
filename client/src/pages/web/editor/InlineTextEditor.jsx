import { useState, useEffect, useRef, useCallback, useLayoutEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight,
  Link2, Unlink, RemoveFormatting, Check,
} from 'lucide-react';

/**
 * InlineTextEditor — contentEditable + dark floating toolbar.
 *
 * Visual reference: text-editor-mocup.html — a dark `#181b22` toolbar with
 * white icon buttons that appears above the current text selection, flips
 * below when there isn't enough room, and has a small arrow pointer. Active
 * formatting buttons get the accent (primary) background.
 *
 * Formatting uses document.execCommand. execCommand is technically
 * deprecated but is still supported in every browser and remains the
 * simplest way to format a contentEditable without pulling in a full
 * rich-text framework. The toolbar is rendered via a portal at
 * document.body so it escapes any overflow:hidden / stacking context
 * (the Fluid Engine grid container, section padding, etc.).
 *
 * Drop-in replacement for the old BaseEditableText click-to-input editor —
 * same prop signature, so all BlockContent call sites work unchanged.
 */
const TOOLBAR_HEIGHT = 40; // approximate, used for initial placement
const VIEWPORT_MARGIN = 8; // px from viewport edge
const GAP = 10; // px between toolbar and selection

export default function InlineTextEditor({
  content,
  onChange,
  onEditingStart,
  onEditingEnd,
  placeholder = 'Click to edit',
  className = '',
  style = {},
  multiline = false,
  tag = 'span',
  minHeight,
  // 'full'   — text blocks: paragraph/headings, lists, quote, alignment + inline
  // 'inline' — titles, subtitles: bold/italic/underline/strike, link, clear
  // 'none'   — plain fields (dates, numbers, labels): no formatting at all
  toolbar = multiline ? 'full' : 'inline',
}) {
  const plainOnly = toolbar === 'none';
  const ref = useRef(null);
  const toolbarRef = useRef(null);
  const linkOpenRef = useRef(false); // link URL form open in the toolbar
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, flip: false });
  const [activeFormats, setActiveFormats] = useState({});
  const Tag = tag;

  // ── Sync external content → contentEditable ─────────────────────────────
  // Only update the DOM when the editor is NOT focused, so we don't blow
  // away the user's caret position while they're typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = content || '';
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [content]);

  // ── Editing lifecycle ───────────────────────────────────────────────────
  const handleFocus = useCallback(() => {
    onEditingStart?.();
    // Show the formatting toolbar on focus, not just on text selection.
    // Use a small delay so the browser has time to place the cursor.
    setTimeout(() => computePositionRef.current?.(), 0);
  }, [onEditingStart]);

  // True once the user has changed the text in the current focus session.
  // Blur-time cleanup only runs then, so merely clicking in and out of a
  // field never rewrites stored content.
  const editedRef = useRef(false);

  const handleInput = useCallback((e) => {
    editedRef.current = true;
    const el = e.currentTarget;
    // Browsers leave a <br> after deleting all text, which prevents the
    // :empty CSS placeholder from showing. Strip it so the placeholder
    // reappears when the field is effectively empty.
    if (el.innerHTML === '<br>' || (el.children.length === 1 && el.firstChild?.tagName === 'BR' && !el.textContent)) {
      el.innerHTML = '';
    }
    onChange?.(el.innerHTML);
  }, [onChange]);

  // Single-line fields (headings, button labels, eyebrows) should not allow
  // line breaks — Enter commits/blurts instead of inserting <br> or <div>.
  // Escape also commits and blurs, matching builder-mockup.html's spec
  // ("Click outside or press Esc to commit and exit").
  const handleKeyDown = useCallback((e) => {
    // Plain fields store text only — formatting would be silently dropped.
    if (plainOnly && (e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      ref.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      ref.current?.blur();
    }
  }, [multiline, plainOnly]);

  // Strip <br>/<div> that browsers may have inserted when the field is
  // supposed to be single-line (e.g. from a paste or a prior multiline
  // session). Runs on paste and on blur.
  const stripLineBreaks = useCallback((el) => {
    if (multiline) return;
    el.querySelectorAll('br, div, p').forEach((node) => {
      if (node.tagName === 'BR') node.remove();
      else { while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node); node.remove(); }
    });
    // Collapse the content back into the host element
    el.normalize();
  }, [multiline]);

  const handlePaste = useCallback((e) => {
    // Single-line and plain fields paste as plain text.
    if (multiline && !plainOnly) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }, [multiline, plainOnly]);

  const handleBlurSanitize = useCallback((e) => {
    // Don't exit editing if focus is moving to a toolbar control — the
    // toolbar buttons use onMouseDown preventDefault to keep the editor
    // focused, but a <select>/<input> for link URL would steal focus.
    const next = e.relatedTarget;
    if (next?.closest?.('[data-inline-toolbar="1"]')) {
      // Typing a link URL in the toolbar: stay in this editing session.
      if (next.tagName === 'INPUT') return;
      ref.current?.focus();
      return;
    }
    const el = e.currentTarget;
    if (!multiline && editedRef.current) {
      const before = el.innerHTML;
      stripLineBreaks(el);
      const after = el.innerHTML;
      if (after !== before) onChange?.(after);
    }
    editedRef.current = false;
    onEditingEnd?.(e);
    setVisible(false);
  }, [multiline, stripLineBreaks, onChange, onEditingEnd]);

  // Stop mousedown from bubbling — without this, parent drag handlers
  // (react-rnd, FluidBlock overlay) call preventDefault and kill native
  // text selection inside the contentEditable.
  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // ── Active formatting state ─────────────────────────────────────────────
  const updateActiveFormats = useCallback(() => {
    try {
      const formatBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        formatBlock,
      });
    } catch {
      // queryCommandState can throw in some browsers — ignore
    }
  }, []);

  // ── Toolbar positioning ─────────────────────────────────────────────────
  // Helper: position the toolbar at a given rect (selection or caret)
  const positionToolbarAtRect = useCallback((rect) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tbEl = toolbarRef.current;
    const tbWidth = tbEl ? tbEl.offsetWidth : 480;
    const tbHeight = tbEl ? tbEl.offsetHeight : TOOLBAR_HEIGHT;

    // Vertical: prefer above, flip below if not enough room.
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    let top;
    let flip = false;
    if (spaceAbove >= tbHeight + GAP && spaceAbove >= spaceBelow) {
      top = rect.top - tbHeight - GAP; // above
    } else if (spaceBelow >= tbHeight + GAP) {
      top = rect.bottom + GAP; // below
      flip = true;
    } else {
      // Not enough room on either side — pick whichever has more and clamp.
      if (spaceAbove >= spaceBelow) {
        top = Math.max(VIEWPORT_MARGIN, rect.top - tbHeight - GAP);
      } else {
        top = Math.min(vh - tbHeight - VIEWPORT_MARGIN, rect.bottom + GAP);
        flip = true;
      }
    }

    // Horizontal: center on the rect, clamp to viewport.
    let left = rect.left + rect.width / 2;
    const halfWidth = tbWidth / 2;
    if (left - halfWidth < VIEWPORT_MARGIN) {
      left = VIEWPORT_MARGIN + halfWidth;
    } else if (left + halfWidth > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN - halfWidth;
    }

    setVisible(true);
    setPosition({ top, left, flip });
    updateActiveFormats();
  }, [updateActiveFormats]);

  const computePosition = useCallback(() => {
    if (plainOnly) { setVisible(false); return; }
    if (linkOpenRef.current) return; // selection is in the link input
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setVisible(false);
      return;
    }
    const target = ref.current;
    if (!target) return;

    let range;
    try {
      range = sel.getRangeAt(0);
    } catch {
      return;
    }
    // Only show when the selection is inside THIS editor's element.
    if (!target.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== target) {
      setVisible(false);
      return;
    }
    // On collapsed (caret-only) selection, show the toolbar at the caret
    // position so formatting controls are discoverable on focus.
    // Selection-sensitive controls (bold, italic, etc.) will show as inactive
    // until the user selects text.
    if (sel.isCollapsed) {
      const caretRect = range.getBoundingClientRect();
      // If caret has no rect (e.g. empty editor), use the element's rect
      const elRect = target.getBoundingClientRect();
      const rect = (caretRect.width === 0 && caretRect.height === 0) ? elRect : caretRect;
      positionToolbarAtRect(rect);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setVisible(false);
      return;
    }

    positionToolbarAtRect(rect);
  }, [updateActiveFormats, positionToolbarAtRect, plainOnly]);

  // Keep a ref to computePosition so handleFocus (defined above) can call it
  // without creating a circular dependency.
  const computePositionRef = useRef(computePosition);
  computePositionRef.current = computePosition;

  // ── Selection / scroll / resize listeners ───────────────────────────────
  useEffect(() => {
    const onSelectionChange = () => computePosition();
    const onScroll = () => computePosition();
    const onResize = () => setVisible(false);

    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [computePosition]);

  // Re-measure after the toolbar becomes visible (initial estimate may be off).
  useLayoutEffect(() => {
    if (visible) computePosition();
  }, [visible, computePosition]);

  // ── Hide toolbar when clicking outside the editor ───────────────────────
  useEffect(() => {
    const onMouseDown = (e) => {
      const tb = toolbarRef.current;
      const ed = ref.current;
      if (tb?.contains(e.target)) return;
      if (ed?.contains(e.target)) return;
      setVisible(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Command execution ───────────────────────────────────────────────────
  const exec = useCallback((cmd, value = null) => {
    ref.current?.focus();
    try {
      document.execCommand(cmd, false, value);
    } catch {
      // ignore
    }
    onChange?.(ref.current?.innerHTML || '');
    updateActiveFormats();
    // Re-position after the DOM may have changed (e.g. block type change).
    requestAnimationFrame(computePosition);
  }, [onChange, updateActiveFormats, computePosition]);

  // Validate URL — only allow http, https, and relative URLs (no javascript: etc.)
  const sanitizeUrl = (raw) => {
    const url = raw.trim();
    if (!url) return null;
    // Allow relative URLs (no protocol)
    if (!url.includes(':') || url.startsWith('/')) return url;
    // Allow only http/https/mailto/tel
    try {
      const parsed = new URL(url);
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return url;
    } catch {
      // Not a valid absolute URL — treat as relative
      if (!url.startsWith('javascript:') && !url.startsWith('data:')) return url;
    }
    return null;
  };

  // ── Links (inline form in the toolbar, no browser prompt) ─────────────
  const savedRangeRef = useRef(null);
  const [link, setLink] = useState(null); // null | { href, error, existing }
  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return;
    ref.current?.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };
  const closeLink = () => {
    linkOpenRef.current = false;
    setLink(null);
    restoreSelection();
  };
  const openLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!ref.current?.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
    const container = range.commonAncestorContainer;
    const node = container.nodeType === 1 ? container : container.parentElement;
    const existing = node?.closest?.('a');
    const inThis = !!existing && ref.current.contains(existing);
    linkOpenRef.current = true;
    setLink({ href: inThis ? existing.getAttribute('href') || '' : '', error: null, existing: inThis });
  }, []);
  const applyLink = () => {
    const safe = sanitizeUrl(link?.href || '');
    if (!safe) {
      setLink((l) => ({ ...l, error: 'Use https://…, /page, mailto: or tel:' }));
      return;
    }
    linkOpenRef.current = false;
    setLink(null);
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) {
      // Nothing selected: insert the URL itself as the link text.
      const esc = safe.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      exec('insertHTML', `<a href="${esc}">${esc}</a>`);
    } else {
      exec('createLink', safe);
    }
  };
  const removeLink = () => {
    linkOpenRef.current = false;
    setLink(null);
    restoreSelection();
    exec('unlink');
  };

  // ── Placeholder for empty content ───────────────────────────────────────
  // Use a CSS ::before via data attribute so we don't pollute the
  // contentEditable's innerHTML (which would get saved).
  const isEmpty = !content || content.trim() === '' || content === '<br>';

  const mergedStyle = { ...style };
  if (minHeight) mergedStyle.minHeight = `${minHeight}px`;

  return (
    <>
      <Tag
        ref={ref}
        className={`${className} outline-none focus:outline-none cursor-text`}
        style={mergedStyle}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={isEmpty ? placeholder : undefined}
        data-inline-editor="1"
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlurSanitize}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        spellCheck={true}
      />
      {visible && !plainOnly && createPortal(
        <Toolbar
          ref={toolbarRef}
          variant={toolbar}
          position={position}
          activeFormats={activeFormats}
          onCommand={exec}
          onLink={openLink}
          link={link}
          onLinkChange={(href) => setLink((l) => ({ ...l, href, error: null }))}
          onLinkApply={applyLink}
          onLinkRemove={removeLink}
          onLinkCancel={closeLink}
        />,
        document.body,
      )}
    </>
  );
}

// ── Toolbar (dark, floating, arrow pointer — matches mockup) ───────────────
const Toolbar = forwardRef(({ variant, position, activeFormats, onCommand, onLink, link, onLinkChange, onLinkApply, onLinkRemove, onLinkCancel }, ref) => {
  const { top, left, flip } = position;
  const full = variant === 'full';
  return (
    <div
      ref={ref}
      data-inline-toolbar="1"
      role="toolbar"
      aria-label="Inline text formatting"
      className="inline-text-toolbar"
      style={{
        position: 'fixed',
        top,
        left,
        transform: flip
          ? 'translate(-50%, 0) scale(1)'
          : 'translate(-50%, -100%) translateY(-10px) scale(1)',
      }}
      data-flip={flip ? '1' : undefined}
      // keep the editor's selection — except inside the link URL field
      onMouseDown={(e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); }}
    >
      {link ? (
        <div className="flex items-center gap-1.5 px-1" role="group" aria-label="Edit link">
          <input
            autoFocus
            type="text"
            value={link.href}
            onChange={(e) => onLinkChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); onLinkApply(); }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onLinkCancel(); }
            }}
            placeholder="https://… or /page"
            aria-label="Link URL"
            aria-invalid={!!link.error}
            className="w-56 px-2 py-1 rounded text-[13px] bg-white/10 text-white placeholder:text-white/50 outline-none focus:ring-1 focus:ring-white/40"
          />
          <ToolbarButton title="Apply link" onClick={onLinkApply}><Check className="w-[15px] h-[15px]" /></ToolbarButton>
          {link.existing && <ToolbarButton title="Remove link" onClick={onLinkRemove}><Unlink className="w-[15px] h-[15px]" /></ToolbarButton>}
          {link.error && <span className="text-[11px] text-red-300 whitespace-nowrap" role="alert">{link.error}</span>}
        </div>
      ) : (
        <>
          {full && (
            <>
              <ToolbarTextButton title="Paragraph" active={['p', '', 'div'].includes(activeFormats.formatBlock)} onClick={() => onCommand('formatBlock', 'P')}>P</ToolbarTextButton>
              <ToolbarTextButton title="Heading" active={activeFormats.formatBlock === 'h2'} onClick={() => onCommand('formatBlock', 'H2')}>H2</ToolbarTextButton>
              <ToolbarTextButton title="Subheading" active={activeFormats.formatBlock === 'h3'} onClick={() => onCommand('formatBlock', 'H3')}>H3</ToolbarTextButton>
              <Divider />
            </>
          )}
          <ToolbarTextButton title="Bold" active={activeFormats.bold} onClick={() => onCommand('bold')} style={{ fontWeight: 700 }}>B</ToolbarTextButton>
          <ToolbarTextButton title="Italic" active={activeFormats.italic} onClick={() => onCommand('italic')} style={{ fontStyle: 'italic' }}>I</ToolbarTextButton>
          <ToolbarTextButton title="Underline" active={activeFormats.underline} onClick={() => onCommand('underline')} style={{ textDecoration: 'underline' }}>U</ToolbarTextButton>
          <ToolbarTextButton title="Strikethrough" active={activeFormats.strikeThrough} onClick={() => onCommand('strikeThrough')} style={{ textDecoration: 'line-through' }}>S</ToolbarTextButton>
          {full && (
            <>
              <Divider />
              <ToolbarButton title="Bullet list" active={activeFormats.insertUnorderedList} onClick={() => onCommand('insertUnorderedList')}><List className="w-[15px] h-[15px]" /></ToolbarButton>
              <ToolbarButton title="Numbered list" active={activeFormats.insertOrderedList} onClick={() => onCommand('insertOrderedList')}><ListOrdered className="w-[15px] h-[15px]" /></ToolbarButton>
              <ToolbarButton title="Quote" active={activeFormats.formatBlock === 'blockquote'} onClick={() => onCommand('formatBlock', 'BLOCKQUOTE')}><Quote className="w-[15px] h-[15px]" /></ToolbarButton>
              <Divider />
              <ToolbarButton title="Align left" active={activeFormats.justifyLeft && !activeFormats.justifyCenter && !activeFormats.justifyRight} onClick={() => onCommand('justifyLeft')}><AlignLeft className="w-[15px] h-[15px]" /></ToolbarButton>
              <ToolbarButton title="Align center" active={activeFormats.justifyCenter} onClick={() => onCommand('justifyCenter')}><AlignCenter className="w-[15px] h-[15px]" /></ToolbarButton>
              <ToolbarButton title="Align right" active={activeFormats.justifyRight} onClick={() => onCommand('justifyRight')}><AlignRight className="w-[15px] h-[15px]" /></ToolbarButton>
            </>
          )}
          <Divider />
          <ToolbarButton title="Link" onClick={onLink}><Link2 className="w-[15px] h-[15px]" /></ToolbarButton>
          <ToolbarButton title="Clear formatting" onClick={() => onCommand('removeFormat')}><RemoveFormatting className="w-[15px] h-[15px]" /></ToolbarButton>
        </>
      )}
    </div>
  );
});
Toolbar.displayName = 'InlineTextEditorToolbar';

const ToolbarButton = ({ title, active, onClick, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`inline-text-toolbar-btn ${active ? 'active' : ''}`}
  >
    {children}
  </button>
);

const ToolbarTextButton = ({ title, active, onClick, style, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    style={style}
    className={`inline-text-toolbar-btn text ${active ? 'active' : ''}`}
  >
    {children}
  </button>
);

const Divider = () => <span className="inline-text-toolbar-div" />;
