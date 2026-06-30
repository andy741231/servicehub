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
          DEFAULT: "hsl(var(--primary))",
          hover:       "hsl(var(--primary-hover))",
          light:       "hsl(var(--primary-light))",
          foreground:  "hsl(var(--primary-foreground))",
        },
        // Surfaces
        background:    "hsl(var(--background))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised:  "hsl(var(--surface-raised))",
        },
        // Borders
        border: {
          DEFAULT: "hsl(var(--border))",
          strong:  "hsl(var(--border-strong))",
        },
        // Text
        "text-base":    "hsl(var(--text-base))",
        "text-muted":   "hsl(var(--text-muted))",
        "text-subtle":  "hsl(var(--text-subtle))",
        "text-inverse": "hsl(var(--text-inverse))",
        // Semantic states
        success: {
          DEFAULT: "hsl(var(--success))",
          light:   "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light:   "hsl(var(--warning-light))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          light:   "hsl(var(--danger-light))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          light:   "hsl(var(--info-light))",
        },
      },

      borderRadius: {
        sm:   "var(--radius-sm-value)",
        base: "var(--radius-base-value)",
        card: "var(--radius-card-value)",
        lg:   "var(--radius-lg-value)",
      },

      boxShadow: {
        card:     "var(--shadow-card-value)",
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
