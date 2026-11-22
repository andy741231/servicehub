/**
 * Page sections — layout math shared by the public renderer and the editor's
 * interactive grid (pages/web/editor/fluid/FluidSection.jsx), so a block sits
 * at the same place in both.
 */
import { useEffect, useRef } from 'react';
import SiteBlock from './SiteBlock';
import { resolveUrl } from './siteRichText';

export const MOBILE_GRID_COLUMNS = 6;

/** Darkening layer over a section photo, so text on top stays readable. */
export const SECTION_OVERLAYS = { none: 0, light: 0.25, medium: 0.45, dark: 0.65 };

/**
 * Darkening over a background photo/video, 0–1. Stored as a percentage
 * (inspector slider) or, on older pages, as none/light/medium/dark.
 */
export function sectionOverlayAlpha(cfg = {}) {
  const v = cfg.backgroundOverlay;
  if (typeof v === 'number') return Math.max(0, Math.min(90, v)) / 100;
  return SECTION_OVERLAYS[v] ?? 0;
}

/**
 * Content width (inspector → Content width): caps the section's layout grid
 * and centres it. Unset = full width, as every section was before.
 */
export const SECTION_CONTENT_WIDTHS = { narrow: 760, medium: 1100 };
export function sectionContentWidthStyle(cfg = {}) {
  const w = SECTION_CONTENT_WIDTHS[cfg.contentWidth];
  return w ? { maxWidth: w, marginLeft: 'auto', marginRight: 'auto' } : {};
}

/**
 * Looping, muted background video (fluidConfig.backgroundVideo) behind the
 * section's content, with the same darkening as photos. Paused for people
 * who prefer reduced motion. Decorative: hidden from assistive tech.
 */
export function SectionVideo({ cfg }) {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = v.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) v.pause();
  }, [cfg?.backgroundVideo]);
  if (!cfg?.backgroundVideo) return null;
  const o = sectionOverlayAlpha(cfg);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <video
        ref={ref}
        src={resolveUrl(cfg.backgroundVideo)}
        poster={cfg.backgroundImage ? resolveUrl(cfg.backgroundImage) : undefined}
        autoPlay muted loop playsInline preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {o > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${o})` }} />}
    </div>
  );
}

/** Section background photo (kept in the fluidConfig JSON — no schema change). */
function sectionBackground(section) {
  const cfg = section.fluidConfig || {};
  if (!cfg.backgroundImage) return {};
  const o = sectionOverlayAlpha(cfg);
  const url = `url("${resolveUrl(cfg.backgroundImage)}")`;
  return {
    backgroundImage: o ? `linear-gradient(rgba(0,0,0,${o}), rgba(0,0,0,${o})), ${url}` : url,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/** Outer box (padding/margins/background) of a section. Defaults are 0. */
export function sectionBoxStyle(section) {
  return {
    ...sectionBackground(section),
    paddingTop:      section.paddingTop     ?? 0,
    paddingBottom:   section.paddingBottom  ?? 0,
    paddingLeft:     section.paddingLeft    ?? 0,
    paddingRight:    section.paddingRight   ?? 0,
    marginTop:       section.marginTop      ?? 0,
    marginBottom:    section.marginBottom   ?? 0,
    backgroundColor: section.backgroundColor || undefined,
  };
}

/** min-height of a fluid section (only when "fill screen" is on). */
export function fluidSectionMinHeight(cfg) {
  return cfg.fillScreen ? (cfg.minHeight || 320) : undefined;
}

/**
 * Mobile placements for a section's blocks (same order as `blocks`).
 * Blocks with their own mobile layout (`fluidMobile`) keep it. Otherwise the
 * section is auto-stacked: blocks in desktop reading order (row, then
 * column), each full width, keeping its desktop height, one after another.
 * (Previously desktop columns were reused on the 6-column grid, so a block
 * right of column 7 rendered at zero width — invisible on phones.)
 */
export function mobilePlacements(blocks) {
  const list = blocks || [];
  if (list.length && list.every((b) => b.fluidMobile)) return list.map((b) => b.fluidMobile);
  const desk = list.map((b) => b.fluid || {});
  const order = list.map((_, i) => i).sort((a, b) =>
    ((desk[a].rowStart || 1) - (desk[b].rowStart || 1)) || ((desk[a].colStart || 1) - (desk[b].colStart || 1)) || (a - b));
  const out = new Array(list.length);
  // Start where the first desktop block starts, so a section's top spacing is kept.
  let cursor = Math.min(...desk.map((f) => f.rowStart || 1), Infinity);
  if (!Number.isFinite(cursor)) cursor = 1;
  for (const i of order) {
    if (list[i].fluidMobile) { out[i] = list[i].fluidMobile; continue; }
    const f = desk[i];
    const span = Math.max(1, (f.rowEnd || 3) - (f.rowStart || 1));
    out[i] = { colStart: 1, colEnd: MOBILE_GRID_COLUMNS + 1, rowStart: cursor, rowEnd: cursor + span, zIndex: f.zIndex ?? 0 };
    cursor += span;
  }
  return out;
}

/**
 * Grid metrics for a fluid section.
 * @param mobile  use the 6-column mobile grid and mobile placements
 * @param extraRows  extra empty rows (the editor adds room while dragging)
 */
export function fluidGridMetrics(section, { mobile = false, extraRows = 0 } = {}) {
  const cfg = section.fluidConfig || {};
  const columns = mobile ? MOBILE_GRID_COLUMNS : (cfg.gridColumns || 24);
  const rowHeight = cfg.rowHeight || 80;
  const gapH = cfg.gap?.horizontal ?? 8;
  const gapV = cfg.gap?.vertical ?? 8;
  const blocks = section.blocks || [];
  const placements = mobile ? mobilePlacements(blocks) : blocks.map((b) => b.fluid || {});
  const maxRowEnd = placements.reduce((max, f) => Math.max(max, f.rowEnd ?? 3), 1);
  const rows = Math.max(maxRowEnd, 4) + extraRows;
  const vAlign = cfg.verticalAlignment === 'center' ? 'center' : cfg.verticalAlignment === 'bottom' ? 'end' : 'start';
  return {
    columns, rowHeight, gapH, gapV, rows, maxRowEnd, placements,
    gridStyle: {
      // Own stacking context: a block with a negative layer (older data) stays
      // above the page background instead of disappearing behind it.
      isolation: 'isolate',
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, ${rowHeight}px)`,
      gap: `${gapV}px ${gapH}px`,
      alignContent: vAlign,
    },
  };
}

/** CSS grid placement of a block. */
export function gridItemStyle(f, columns) {
  return {
    gridColumn: `${f.colStart || 1} / ${f.colEnd || columns + 1}`,
    gridRow: `${f.rowStart || 1} / ${f.rowEnd || 3}`,
    zIndex: f.zIndex ?? 0,
    position: 'relative',
  };
}

/** True when no block in the section has a custom mobile layout. */
export const isMobileAuto = (blocks) => !(blocks || []).some((b) => b.fluidMobile);

/**
 * Auto mobile layout as a flow: blocks stacked in reading order, each at
 * least its desktop height but free to grow with its (now narrower, taller)
 * content — so stacked blocks can never overlap. Used by the public site and
 * the editor's mobile view.
 */
export function mobileAutoFlow(section) {
  const blocks = section.blocks || [];
  const { rowHeight, gapV, rows } = fluidGridMetrics(section, { mobile: true });
  const placements = mobilePlacements(blocks);
  const order = blocks.map((_, i) => i).sort((a, b) => placements[a].rowStart - placements[b].rowStart);
  const firstRow = placements.length ? Math.min(...placements.map((p) => p.rowStart)) : 1;
  const vAlign = section.fluidConfig?.verticalAlignment === 'center' ? 'center' : section.fluidConfig?.verticalAlignment === 'bottom' ? 'end' : 'start';
  return {
    order,
    containerStyle: {
      isolation: 'isolate',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      rowGap: `${gapV}px`,
      alignContent: vAlign,
      // Same overall minimum as the fixed grid (it always has >= 4 rows)
      minHeight: rows * rowHeight + (rows - 1) * gapV,
      paddingTop: (firstRow - 1) * (rowHeight + gapV),
    },
    itemStyle: (i) => {
      const span = placements[i].rowEnd - placements[i].rowStart;
      return { minHeight: span * rowHeight + (span - 1) * gapV, position: 'relative', zIndex: placements[i].zIndex ?? 0 };
    },
  };
}

function FluidSectionView({ section }) {
  const cfg = section.fluidConfig;
  const blocks = section.blocks || [];
  const desktop = fluidGridMetrics(section);
  const mobile = fluidGridMetrics(section, { mobile: true });
  const hasVideo = !!cfg?.backgroundVideo;
  // Only sections that use these settings get extra styles.
  const layer = { ...sectionContentWidthStyle(cfg), ...(hasVideo ? { position: 'relative', zIndex: 1 } : {}) };
  return (
    <div style={{ ...sectionBoxStyle(section), minHeight: fluidSectionMinHeight(cfg), ...(hasVideo ? { position: 'relative' } : {}) }}>
      <SectionVideo cfg={cfg} />
      {/* Desktop / tablet layout (>= 768px) */}
      <div className="fluid-grid-desktop" style={{ ...desktop.gridStyle, ...layer }}>
        {blocks.map((block, bIdx) => (
          <div key={block.id || bIdx} style={gridItemStyle(block.fluid || {}, desktop.columns)}>
            <SiteBlock block={block} />
          </div>
        ))}
      </div>
      {/* Mobile layout (< 768px): custom grid if any block has a mobile
          layout, otherwise the auto-stacked flow. */}
      {isMobileAuto(blocks) ? (() => {
        const flow = mobileAutoFlow(section);
        return (
          <div className="fluid-grid-mobile" style={{ ...flow.containerStyle, ...layer }}>
            {flow.order.map((bIdx) => (
              <div key={blocks[bIdx].id || bIdx} style={flow.itemStyle(bIdx)}>
                <SiteBlock block={blocks[bIdx]} />
              </div>
            ))}
          </div>
        );
      })() : (
        <div className="fluid-grid-mobile" style={{ ...mobile.gridStyle, ...layer }}>
          {blocks.map((block, bIdx) => (
            <div key={block.id || bIdx} style={gridItemStyle(mobile.placements[bIdx], mobile.columns)}>
              <SiteBlock block={block} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const renderBlockList = (blocks) => (blocks || []).map((block) => <SiteBlock key={block.id} block={block} />);

/** All page content: sections (fluid or legacy columns) or legacy flat blocks. */
export default function SiteSections({ pageData }) {
  if (pageData.sections && pageData.sections.length > 0) {
    return pageData.sections.map((section, sIdx) => {
      // Hidden in the editor (section eye toggle): not shown on the site.
      if (section.fluidConfig?.hidden) return null;
      if (section.fluidConfig) return <FluidSectionView key={section.id || sIdx} section={section} />;
      // Legacy column-based section
      return (
        <div key={section.id || sIdx} style={sectionBoxStyle(section)}>
          {section.columns > 1 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                gap: `${section.gap ?? 24}px`,
              }}
            >
              {renderBlockList(section.blocks)}
            </div>
          ) : (
            renderBlockList(section.blocks)
          )}
        </div>
      );
    });
  }
  // Legacy: flat blocks directly on the page
  return renderBlockList(pageData.blocks);
}
