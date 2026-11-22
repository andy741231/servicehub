/**
 * Site theme — turns a page's `siteStyle` into the CSS variables that the
 * `.public-site` styles (index.css) read. Shared by the public renderer and
 * the editor canvas so both show the same fonts and colors.
 */
import { useEffect } from 'react';

export const DEFAULT_SITE_TOKENS = {
  colors: {
    primary: '#152b45', secondary: '#54738e', accent: '#b08a4a',
    background: '#f8f6f1', text: '#152b45', muted: '#647384',
  },
  fonts: {
    heading: 'DM Sans, sans-serif', body: 'DM Sans, sans-serif',
    serif: 'Libre Baskerville, Georgia, serif',
  },
  spacing: { base: 16 },
  borderRadius: { default: 5 },
};

export const hexToHsl = (hex) => {
  const value = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/** Same hue, new lightness (and optionally capped saturation): an HSL triplet. */
export const shade = (hex, lightness, maxSat = 100) => {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const [h, sat, l] = hsl.split(' ').map(parseFloat);
  const L = typeof lightness === 'function' ? lightness(l) : lightness;
  return `${h} ${Math.min(sat, maxSat)}% ${Math.max(0, Math.min(100, Math.round(L)))}%`;
};

const fontFamilyUrl = (font) => {
  const family = String(font || '').split(',')[0].trim();
  return family ? family.replace(/ /g, '+') : '';
};

/** Merge a page's siteStyle tokens over the defaults. */
export function resolveSiteTokens(siteStyle) {
  const t = siteStyle?.tokens || {};
  return {
    colors: { ...DEFAULT_SITE_TOKENS.colors, ...(t.colors || {}) },
    fonts: { ...DEFAULT_SITE_TOKENS.fonts, ...(t.fonts || {}) },
    spacing: { ...DEFAULT_SITE_TOKENS.spacing, ...(t.spacing || {}) },
    borderRadius: { ...DEFAULT_SITE_TOKENS.borderRadius, ...(t.borderRadius || {}) },
  };
}

/** Inline style (CSS custom properties) for the `.public-site` wrapper. */
export function siteThemeStyle(siteTokens) {
  const colorVars = Object.fromEntries([
    ['--primary', siteTokens.colors.primary],
    // Hover: the primary a little darker (or lighter when it is already very dark).
    ['--primary-hover', shade(siteTokens.colors.primary, l => (l < 20 ? l + 8 : l - 8)) || siteTokens.colors.primary],
    ['--accent', siteTokens.colors.accent],
    // A pale tint of the primary (icon circles, active nav pill). It used to be the
    // secondary colour, which put primary-coloured icons on a mid-tone circle.
    ['--primary-light', shade(siteTokens.colors.primary, 94, 45) || siteTokens.colors.secondary],
    ['--primary-foreground', '#fffefa'],
    ['--background', siteTokens.colors.background],
    ['--surface', '#fffefa'],
    ['--surface-raised', siteTokens.colors.background],
    // One step darker than the page background (placeholders, skeletons).
    ['--surface-tertiary', shade(siteTokens.colors.background, l => l - 6) || siteTokens.colors.secondary],
    ['--border', '#d9dde0'],
    ['--border-soft', '#edf0f1'],
    ['--border-strong', '#cbd1d6'],
    ['--text-base', siteTokens.colors.text],
    ['--text-muted', siteTokens.colors.muted],
    ['--text-subtle', siteTokens.colors.muted],
    ['--text-inverse', '#fffefa'],
  ].map(([key, value]) => [key, hexToHsl(value) || value]));
  return {
    ...colorVars,
    '--font-heading': siteTokens.fonts.heading,
    '--font-body': siteTokens.fonts.body,
    '--font-serif': siteTokens.fonts.serif,
    '--space-base': `${siteTokens.spacing.base}px`,
    '--radius-base-value': `${siteTokens.borderRadius.default}px`,
    '--radius-card-value': `${siteTokens.borderRadius.default}px`,
  };
}

/** Load the site's Google Fonts once a page is available. */
export function useSiteFonts(siteTokens, enabled = true) {
  const { heading, body, serif } = siteTokens.fonts;
  useEffect(() => {
    if (!enabled) return;
    const families = [...new Set([heading, body, serif].map(fontFamilyUrl).filter(Boolean))];
    if (!families.length) return;
    const id = 'public-site-fonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&')}&display=swap`;
  }, [enabled, heading, body, serif]);
}
