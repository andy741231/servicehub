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
 *
 * `layoutWidth` (desktop): lay the page out at this width even when side
 * panels leave less room, and scale it down to fit. Blocks follow their own
 * width (container queries), so laying out at the narrower width showed
 * different layouts than visitors get (a half-width block: 1 column in the
 * editor, 2 on the site). The scale is exposed as `data-canvas-scale` on the
 * iframe for code that maps canvas coordinates into the editor window.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MIN_SCALE = 0.8;
const SRC_DOC = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';

export default function CanvasFrame({ width = '100%', layoutWidth, minHeight, onDocument, title = 'Page canvas', className = '', children }) {
  const iframeRef = useRef(null);
  const boxRef = useRef(null);
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const ro = new ResizeObserver(() => setBoxWidth(box.clientWidth));
    ro.observe(box);
    setBoxWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);
  // Never shrink the page below MIN_SCALE: with several panels open it became
  // unreadable (0.3 at 1280px, a 128px sliver at 1024). Below that, lay the
  // page out narrower instead (as before scaling existed).
  let scale = 1;
  let frameWidth = layoutWidth;
  if (layoutWidth && boxWidth && boxWidth < layoutWidth) {
    scale = Math.max(MIN_SCALE, boxWidth / layoutWidth);
    frameWidth = Math.round(boxWidth / scale);
  }
  const [mountNode, setMountNode] = useState(null);
  const [height, setHeight] = useState(0);
  // Editor controls drawn on the canvas (.site-editor-ui) undo the scale via
  // this variable, so toolbars, labels and handles keep their real size.
  useEffect(() => {
    mountNode?.ownerDocument.documentElement.style.setProperty('--ui-scale', String(1 / scale));
  }, [mountNode, scale]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    let cleanup = () => {};

    const init = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body || doc.body.dataset.canvasReady) return;
      doc.body.dataset.canvasReady = '1';
      doc.body.style.margin = '0';

      // Contain horizontal overflow at the document level. Block resize
      // handles protrude a few px past the canvas edge; without a clip they
      // grow document.scrollWidth, a scrollbar appears, the layout reflows,
      // the scrollbar disappears — an endless ~8px jitter across the canvas.
      // `clip` (not `hidden`) doesn't create a scroll container.
      doc.documentElement.style.overflowX = 'clip';
      doc.body.style.overflowX = 'clip';

      // Mirror stylesheets from the editor document. Public site routes and
      // floating canvas chrome are always light (admin dark mode is internal
      // only — mirroring `dark` turns `text-text-base` white on `bg-white`
      // pills and light-gray on public feature cards).
      const sync = () => {
        doc.head.querySelectorAll('[data-canvas-mirror]').forEach((n) => n.remove());
        document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          const copy = node.cloneNode(true);
          copy.setAttribute('data-canvas-mirror', '');
          doc.head.appendChild(copy);
        });
        doc.documentElement.classList.remove('dark');
        doc.documentElement.classList.add('light');
        doc.documentElement.style.colorScheme = 'light';
      };
      sync();
      const headObserver = new MutationObserver(sync);
      headObserver.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true });

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

  const scaled = scale < 1;
  return (
    // With a layoutWidth the wrapper never takes the iframe's width (clip +
    // min-width 0), or a 1440px iframe would widen it and undo the scale.
    <div ref={boxRef} style={layoutWidth ? { minWidth: 0, overflow: 'clip', height: scaled && height ? height * scale : undefined } : undefined}>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={SRC_DOC}
        data-canvas-scale={scale}
        className={`block border-0 ${scaled ? '' : 'mx-auto'} ${className}`}
        style={scaled
          ? { width: frameWidth, height: height || undefined, minHeight: minHeight ? `calc((${minHeight}) / ${scale})` : undefined, transform: `scale(${scale})`, transformOrigin: '0 0' }
          : { width, height: height || undefined, minHeight, transition: 'width .2s ease' }}
      />
      {mountNode && createPortal(children, mountNode)}
    </div>
  );
}
