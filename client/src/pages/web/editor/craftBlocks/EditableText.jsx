import { useRef, useEffect } from 'react';

export default function EditableText({ content, onChange, className, style, tag = 'span', placeholder, multiline }) {
  const ref = useRef(null);
  const Tag = tag;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const html = content || '';
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [content]);

  const handleBlur = (e) => {
    onChange?.(e.currentTarget.innerHTML);
  };

  return (
    <Tag
      ref={ref}
      className={className}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      data-placeholder={placeholder}
    />
  );
}
