/**
 * CanvasFrame — renders the editor canvas inside a same-origin iframe.
 *
 * Why: CSS breakpoints (Tailwind `md:` etc.) respond to the *viewport*. In a
 * plain div, the Tablet/Mobile previews were just narrower boxes inside a
 * desktop-width window, so blocks kept their desktop layouts. Inside an
 * iframe of 768px / 390px the page lays out exactly as on a real device.
 *
 * How: children are rendered into the iframe body with a React portal (React
 * attaches its event listeners to the portal's document, so handlers work as
 * usual). The app's stylesheets are mirrored into the iframe — including Vite
 * HMR updates and the light/dark class — and the iframe grows to its content
 * height so the editor's own scroll container keeps scrolling the page.
 *
 * Code running on the canvas must use the element's own document/window
 * (`el.ownerDocument`, `el.ownerDocument.defaultView`), not the globals.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SRC_DOC = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';

export default function CanvasFrame({ width = '100%', minHeight, onDocument, title = 'Page canvas', className = '', children }) {
  const iframeRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    let cleanup = () => {};

    const init = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body || doc.body.dataset.canvasReady) return;
      doc.body.dataset.canvasReady = '1';
      doc.body.style.margin = '0';

      // Mirror stylesheets + theme class from the editor document.
      const sync = () => {
        doc.head.querySelectorAll('[data-canvas-mirror]').forEach((n) => n.remove());
        document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          const copy = node.cloneNode(true);
          copy.setAttribute('data-canvas-mirror', '');
          doc.head.appendChild(copy);
        });
        doc.documentElement.className = document.documentElement.className;
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme) doc.documentElement.setAttribute('data-theme', theme); else doc.documentElement.removeAttribute('data-theme');
      };
      sync();
      const headObserver = new MutationObserver(sync);
      headObserver.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true });
      const rootObserver = new MutationObserver(sync);
      rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

      const root = doc.createElement('div');
      root.id = 'canvas-root';
      doc.body.appendChild(root);

      // Grow the iframe to its content height.
      const RO = doc.defaultView.ResizeObserver;
      const ro = new RO(() => setHeight(root.scrollHeight));
      ro.observe(root);

      setMountNode(root);
      onDocument?.(doc);
      cleanup = () => {
        headObserver.disconnect();
        rootObserver.disconnect();
        ro.disconnect();
        onDocument?.(null);
      };
    };

    // srcdoc iframes become ready on load; handle an already-loaded frame too.
    if (iframe.contentDocument?.readyState === 'complete' && iframe.contentDocument.body) init();
    iframe.addEventListener('load', init);
    return () => {
      iframe.removeEventListener('load', init);
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={SRC_DOC}
        className={`block border-0 mx-auto ${className}`}
        style={{ width, height: height || undefined, minHeight, transition: 'width .2s ease' }}
      />
      {mountNode && createPortal(children, mountNode)}
    </>
  );
}
