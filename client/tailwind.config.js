/** @type {import('tailwindcss').Config} */
// ============================================================
// SERVICE HUB — TAILWIND THEME TOKENS
// Source of truth: THEME.md at the project root.
// These token names map to CSS variables defined in src/index.css.
// Never use raw color values (blue-600, gray-200) in components —
// always use these semantic names.
// ============================================================
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand / Accent
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          hover:       "hsl(var(--primary-hover) / <alpha-value>)",
          light:       "hsl(var(--primary-light) / <alpha-value>)",
          foreground:  "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        // Surfaces
        background:    "hsl(var(--background) / <alpha-value>)",
        surface: {
          DEFAULT:   "hsl(var(--surface) / <alpha-value>)",
          raised:    "hsl(var(--surface-raised) / <alpha-value>)",
          tertiary:  "hsl(var(--surface-tertiary) / <alpha-value>)",
        },
        // Borders
        border: {
          DEFAULT: "hsl(var(--border) / <alpha-value>)",
          soft:    "hsl(var(--border-soft) / <alpha-value>)",
          strong:  "hsl(var(--border-strong) / <alpha-value>)",
        },
        // Text
        "text-base":    "hsl(var(--text-base) / <alpha-value>)",
        "text-muted":   "hsl(var(--text-muted) / <alpha-value>)",
        "text-subtle":  "hsl(var(--text-subtle) / <alpha-value>)",
        "text-inverse": "hsl(var(--text-inverse) / <alpha-value>)",
        // Semantic states
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          light:   "hsl(var(--success-light) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          light:   "hsl(var(--warning-light) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          light:   "hsl(var(--danger-light) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          light:   "hsl(var(--info-light) / <alpha-value>)",
        },
      },

      borderRadius: {
        sm:   "var(--radius-sm-value)",
        base: "var(--radius-base-value)",
        card: "var(--radius-card-value)",
        lg:   "var(--radius-lg-value)",
        '2xl': "var(--radius-2xl-value)",
      },

      boxShadow: {
        card:     "var(--shadow-card-value)",
        'card-sm': "var(--shadow-card-sm-value)",
        dropdown: "var(--shadow-dropdown-value)",
        modal:    "var(--shadow-modal-value)",
      },

      fontSize: {
        display:    ["1.875rem", { lineHeight: "1.2",  fontWeight: "700" }],
        heading:    ["1.25rem",  { lineHeight: "1.3",  fontWeight: "600" }],
        subheading: ["1rem",     { lineHeight: "1.4",  fontWeight: "600" }],
        body:       ["0.875rem", { lineHeight: "1.5",  fontWeight: "400" }],
        small:      ["0.75rem",  { lineHeight: "1.4",  fontWeight: "400" }],
        label:      ["0.75rem",  { lineHeight: "1",    fontWeight: "500" }],
        code:       ["0.8125rem",{ lineHeight: "1.5",  fontWeight: "400" }],
      },

      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
