/**
 * FormEmbed — shows a form from the Hub's Forms app on a site page.
 *
 * The form is the Forms app's own public page (/form/:id?embed=1) in a
 * same-origin iframe, so it keeps its theme, validation, file uploads and
 * thank-you screen, and submissions land in Forms → Submissions. The iframe
 * grows to the form's height (same origin, so its document can be measured).
 */
import { useEffect, useRef, useState } from 'react';

export default function FormEmbed({ formId, title = 'Form', inert = false }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return undefined;
    let ro = null;
    const attach = () => {
      const doc = frame.contentDocument;
      if (!doc?.documentElement) return;
      const measure = () => setHeight(Math.max(200, doc.documentElement.scrollHeight));
      ro?.disconnect();
      ro = new (frame.contentWindow.ResizeObserver || ResizeObserver)(measure);
      ro.observe(doc.documentElement);
      if (doc.body) ro.observe(doc.body);
      measure();
    };
    frame.addEventListener('load', attach);
    return () => { frame.removeEventListener('load', attach); ro?.disconnect(); };
  }, [formId]);

  return (
    <iframe
      ref={ref}
      src={`/form/${encodeURIComponent(formId)}?embed=1`}
      title={title}
      className="block w-full border-0 rounded-[5px]"
      style={{ height, pointerEvents: inert ? 'none' : undefined }}
      loading="lazy"
    />
  );
}
