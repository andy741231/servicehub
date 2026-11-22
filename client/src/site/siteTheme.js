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
  // Site color palette: extra brand colors offered as presets in every site
  // color picker (after the six theme colors above, which aren't repeated).
  // Picker metadata only — no CSS variables; content stores the literal hex.
  // Keep in sync with Styles.jsx DEFAULT_TOKENS and server webStyles.js.
  palette: [
    { name: 'White', value: '#ffffff' },
    { name: 'Ink', value: '#0f1c2e' },
    { name: 'Soft Blue', value: '#eaf0f4' },
    { name: 'Sand', value: '#eadfc9' },
    { name: 'Sage', value: '#8aa39b' },
    { name: 'Warm Gray', value: '#8c857b' },
    { name: 'Terracotta', value: '#b55d4c' },
    { name: 'Deep Teal', value: '#2f5d62' },
  ],
};

/** #rgb / #rrggbb / rgb(r,g,b) → '#rrggbb' (lowercase), or null. */
export function normalizeHex(input) {
  const v = String(input || '').trim();
  let m = v.match(/^#?([0-9a-f]{3})$/i);
  if (m) return `#${m[1].split('').map((c) => c + c).join('')}`.toLowerCase();
  m = v.match(/^#?([0-9a-f]{6})$/i);
  if (m) return `#${m[1]}`.toLowerCase();
  m = v.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+\s*)?\)$/i);
  if (m) return `#${[m[1], m[2], m[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`;
  return null;
}

/** Palette entries with a name and a valid 6-digit hex (others dropped). */
export function cleanPalette(palette) {
  return (Array.isArray(palette) ? palette : [])
    .map((e) => ({ name: String(e?.name || '').trim(), value: normalizeHex(e?.value) }))
    .filter((e) => e.name && e.value);
}

const SEMANTIC_PRESETS = [
  ['primary', 'Primary'], ['secondary', 'Secondary'], ['accent', 'Accent'],
  ['background', 'Background'], ['text', 'Body Text'], ['muted', 'Muted Text'],
];
/**
 * Presets for site color pickers: the six theme colors first, then the
 * palette. Accepts raw or resolved tokens.
 */
export function siteColorPresets(tokens) {
  const t = resolveSiteTokens({ tokens: tokens || {} });
  const semantic = SEMANTIC_PRESETS
    .map(([key, name]) => ({ name, value: normalizeHex(t.colors[key]) }))
    .filter((e) => e.value);
  return [...semantic, ...cleanPalette(t.palette)];
}

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
    // An array: the stored palette when there is one (even if emptied on
    // purpose), otherwise the default.
    palette: Array.isArray(t.palette) ? t.palette : DEFAULT_SITE_TOKENS.palette,
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
