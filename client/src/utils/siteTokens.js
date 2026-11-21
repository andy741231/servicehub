/**
 * Shared site-style token helpers — single source of truth for the public
 * site's design tokens (WebSiteStyle.tokens → CSS custom properties).
 * Used by the public renderer (pages/public/Home.jsx) and the web editor
 * canvas so editor previews match the published site.
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
  // Button tiers — bg/text/border accept a palette token name (primary,
  // accent, background, text, muted…), 'transparent', or a hex value.
  buttons: {
    primary:   { bg: 'primary',     text: '#fffefa', border: '',        radius: 4 },
    secondary: { bg: 'accent',      text: '#fffefa', border: '',        radius: 4 },
    tertiary:  { bg: 'transparent', text: 'primary', border: 'primary', radius: 4 },
  },
};

/** Merge saved tokens over the defaults (tolerates partial/missing groups). */
export const mergeSiteTokens = (tokens) => ({
  colors:       { ...DEFAULT_SITE_TOKENS.colors,       ...(tokens?.colors || {}) },
  fonts:        { ...DEFAULT_SITE_TOKENS.fonts,        ...(tokens?.fonts || {}) },
  spacing:      { ...DEFAULT_SITE_TOKENS.spacing,      ...(tokens?.spacing || {}) },
  borderRadius: { ...DEFAULT_SITE_TOKENS.borderRadius, ...(tokens?.borderRadius || {}) },
  buttons:      {
    primary:   { ...DEFAULT_SITE_TOKENS.buttons.primary,   ...(tokens?.buttons?.primary   || {}) },
    secondary: { ...DEFAULT_SITE_TOKENS.buttons.secondary, ...(tokens?.buttons?.secondary || {}) },
    tertiary:  { ...DEFAULT_SITE_TOKENS.buttons.tertiary,  ...(tokens?.buttons?.tertiary  || {}) },
  },
});

/** '#rrggbb' → 'H S% L%' (CSS custom property triple used by hsl(var(--x))). */
export const hexToHsl = (hex) => {
  const value = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
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

/** Resolve a style-token color value: palette key → var() ref, hex → hsl(), else literal. */
const resolveTokenColor = (v) => {
  const s = String(v || '').trim();
  if (!s || s === 'transparent') return 'transparent';
  const tokenVar = { primary: '--primary', accent: '--accent', background: '--background', secondary: '--secondary', text: '--text-base', muted: '--text-muted' }[s];
  if (tokenVar) return `hsl(var(${tokenVar}))`;
  const hsl = hexToHsl(s);
  return hsl ? `hsl(${hsl})` : s;
};

/**
 * Build the inline CSS-variable map that turns `hsl(var(--primary))` and the
 * `public-*`/`font-serif` rules into the site's palette + fonts.
 */
export const buildPublicStyle = (tokens) => {
  const t = mergeSiteTokens(tokens);
  const buttonVars = {};
  for (const tier of ['primary', 'secondary', 'tertiary']) {
    const b = t.buttons[tier] || {};
    buttonVars[`--btn-${tier}-bg`]     = resolveTokenColor(b.bg);
    buttonVars[`--btn-${tier}-text`]   = resolveTokenColor(b.text);
    buttonVars[`--btn-${tier}-border`] = resolveTokenColor(b.border);
    buttonVars[`--btn-${tier}-radius`] = `${b.radius ?? 4}px`;
  }
  const colorVars = Object.fromEntries([
    ['--primary', t.colors.primary],
    ['--primary-hover', t.colors.primary],
    ['--accent', t.colors.accent],
    ['--secondary', t.colors.secondary],
    ['--primary-light', t.colors.secondary],
    ['--primary-foreground', '#fffefa'],
    ['--background', t.colors.background],
    ['--surface', '#fffefa'],
    ['--surface-raised', t.colors.background],
    ['--surface-tertiary', t.colors.secondary],
    ['--border', '#d9dde0'],
    ['--border-soft', '#edf0f1'],
    ['--border-strong', '#cbd1d6'],
    ['--text-base', t.colors.text],
    ['--text-muted', t.colors.muted],
    ['--text-subtle', t.colors.muted],
    ['--text-inverse', '#fffefa'],
  ].map(([key, value]) => [key, hexToHsl(value) || value]));
  return {
    ...colorVars,
    ...buttonVars,
    '--font-heading': t.fonts.heading,
    '--font-body': t.fonts.body,
    '--font-serif': t.fonts.serif,
    '--space-base': `${t.spacing.base}px`,
    '--radius-base-value': `${t.borderRadius.default}px`,
    '--radius-card-value': `${t.borderRadius.default}px`,
  };
};

const fontFamilyUrl = (f) => {
  const first = String(f || '').split(',')[0].trim().replace(/['"]/g, '');
  const skip = ['sans-serif', 'serif', 'monospace', 'system-ui', 'arial', 'helvetica', 'georgia', 'times new roman', 'ui-sans-serif', 'ui-serif'];
  if (!first || skip.includes(first.toLowerCase())) return null;
  return first.replace(/ /g, '+');
};

/**
 * Inject the site's Google Fonts (once per session) — used by both the public
 * renderer and the editor canvas so serif/heading fonts look identical.
 */
export const useSiteFonts = (tokens, enabled = true) => {
  const fonts = mergeSiteTokens(tokens).fonts;
  useEffect(() => {
    if (!enabled) return undefined;
    const families = [...new Set([fonts.heading, fonts.body, fonts.serif]
      .map(fontFamilyUrl)
      .filter(Boolean))];
    if (!families.length) return undefined;
    const id = 'public-site-fonts';
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${f}:ital,wght@0,400;0,500;0,600;0,700;1,400`).join('&')}&display=swap`;
    return undefined;
  }, [enabled, fonts.heading, fonts.body, fonts.serif]);
};


