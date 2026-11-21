/**
 * Convert a block's `style` object (edited via the inspector's Design tab)
 * into inline CSS. Shared by the public renderer (Home.jsx) and the editor
 * canvas (FluidBlock) so Design-tab changes render identically in both.
 */
export function blockStyleCss(style = {}, content = {}) {
  const cs = style || {};
  const bc = content || {};
  return {
    backgroundColor: cs.backgroundColor,
    color:           cs.color,
    paddingTop:      cs.paddingTop    != null ? `${cs.paddingTop}px`    : cs.padding != null ? `${cs.padding}px` : undefined,
    paddingBottom:   cs.paddingBottom != null ? `${cs.paddingBottom}px` : cs.padding != null ? `${cs.padding}px` : undefined,
    paddingLeft:     cs.paddingLeft   != null ? `${cs.paddingLeft}px`   : undefined,
    paddingRight:    cs.paddingRight  != null ? `${cs.paddingRight}px`  : undefined,
    marginTop:       cs.marginTop     != null ? `${cs.marginTop}px`     : undefined,
    marginBottom:    cs.marginBottom  != null ? `${cs.marginBottom}px`  : undefined,
    textAlign:       cs.textAlign,
    borderWidth:     cs.borderWidth,
    borderStyle:     cs.borderStyle,
    borderColor:     cs.borderColor,
    borderRadius:    cs.borderRadius != null ? `${cs.borderRadius}px` : undefined,
    height:          bc._height != null ? `${bc._height}px` : undefined,
    gridColumn:      bc._colStart
      ? `${bc._colStart} / span ${bc._colSpan || 1}`
      : bc._colSpan > 1 ? `span ${bc._colSpan}` : undefined,
    gridRow:         bc._rowStart
      ? `${bc._rowStart} / span ${bc._rowSpan || 1}`
      : bc._rowSpan > 1 ? `span ${bc._rowSpan}` : undefined,
  };
}
