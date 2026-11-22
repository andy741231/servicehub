/**
 * Field components used by site blocks. Each one renders the published
 * markup by default; when a block is rendered inside the editor, the editor
 * supplies editable implementations through SiteEditContext. This is what
 * lets the editor canvas and the public site share one set of block
 * components (no editor code ends up in the public bundle).
 *
 * Every field takes a `path` into block.content, e.g. "title" or
 * "items.2.label". Edit implementations call update(path, value).
 */
import { createContext, useContext } from 'react';
import { rt } from './siteRichText';

/**
 * null on the public site. In the editor: { Text, Image, Link, ListAdd,
 * NestedAdd } components (see pages/web/editor/siteEditBridge.jsx).
 */
export const SiteEditContext = createContext(null);
export const useSiteEdit = () => useContext(SiteEditContext);

/**
 * Text field. Rich (HTML/markdown, the default) or `plain` (rendered as text).
 * `prefix`/`suffix` decorate the published value (e.g. quote marks) without
 * being stored. `optional` fields render nothing on the site when empty but
 * stay visible (with a placeholder) in the editor. `toolbar="full"` (editor
 * only) offers headings/lists for long-form text; other rich fields get
 * inline formatting, plain fields none.
 */
export function Text({ as: Tag = 'div', path, value, className, style, placeholder, multiline, plain, optional, prefix = '', suffix = '', toolbar }) {
  const edit = useSiteEdit();
  if (edit?.Text) {
    return (
      <edit.Text
        as={Tag} path={path} value={value} className={className} style={style}
        placeholder={placeholder} multiline={multiline} plain={plain} prefix={prefix} suffix={suffix}
        toolbar={toolbar}
      />
    );
  }
  if (optional && !value) return null;
  if (plain) return <Tag className={className} style={style}>{value}</Tag>;
  return <Tag className={className} style={style} dangerouslySetInnerHTML={rt(value && `${prefix}${value}${suffix}`)} />;
}

/** Image field (`value` is the image URL). */
export function Image({ path, value, alt, className, style, wrapperClassName }) {
  const edit = useSiteEdit();
  if (edit?.Image) return <edit.Image path={path} value={value} alt={alt} className={className} style={style} wrapperClassName={wrapperClassName} />;
  // An image nobody has chosen yet renders nothing (not a broken <img>).
  if (!value) return null;
  return <img src={value} alt={alt} className={className} style={style} />;
}

/**
 * Link/button: editable label (`textPath`) + URL (`hrefPath`). `after` is
 * decoration rendered after the label (e.g. an arrow). `optional` links are
 * hidden on the site when the label is empty.
 */
export function Link({ textPath, hrefPath, text, href, className, after = null, optional, placeholder }) {
  const edit = useSiteEdit();
  if (edit?.Link) {
    return (
      <edit.Link
        textPath={textPath} hrefPath={hrefPath} text={text} href={href}
        className={className} after={after} placeholder={placeholder}
      />
    );
  }
  if (optional && !text) return null;
  return <a href={href || '#'} className={className}>{text}{after}</a>;
}

/** "+ Add item" control for a list field. Renders nothing on the site. */
export function ListAdd({ path, make, label }) {
  const edit = useSiteEdit();
  if (!edit?.ListAdd) return null;
  return <edit.ListAdd path={path} make={make} label={label} />;
}
