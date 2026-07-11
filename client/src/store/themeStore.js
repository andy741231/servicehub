import { create } from 'zustand';
import api from '../utils/api';

const STORAGE_KEY = 'theme';

// Read the user's stored preference, if any. Returns 'light' | 'dark' | null.
const loadStoredTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {
    console.error('Failed to load theme preference:', e);
  }
  return null;
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

// Resolve the effective theme: explicit choice wins, else the OS setting.
const resolveInitialTheme = () => loadStoredTheme() || (systemPrefersDark() ? 'dark' : 'light');

// Dark mode is an internal (admin) preference. Public site routes
// (/, /form/:slug, /:slug) always render light regardless of the user's choice.
const isAdminPath = (path) => {
  const p = path ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return p.startsWith('/hub-admin') || p === '/login';
};

// Apply the theme by toggling classes on <html>. We add an explicit `.light`
// class (not just removing `.dark`) so CSS can tell "user chose light" apart
// from "no choice yet" and avoid falling back to the media query.
// On public routes the effective theme is forced to light.
const applyTheme = (theme, path) => {
  if (typeof document === 'undefined') return;
  const effective = isAdminPath(path) ? theme : 'light';
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.classList.toggle('light', effective === 'light');
  root.style.colorScheme = effective;
};

// Duration (ms) of the gentle color transition when the user toggles the
// theme. Kept short enough to feel responsive but long enough to avoid the
// harsh flash that hurts the eyes when switching between light and dark.
const THEME_TRANSITION_MS = 1200;

// Wrap a theme change in a smooth transition so the switch doesn't flash.
//   1. View Transitions API (Chrome/Edge 111+, Safari 18+) — smooth crossfade.
//   2. Fallback: a temporary `.theme-transitioning` class on <html> that
//      animates background-color/border-color/color/etc. on every element for
//      the duration. The class is removed afterwards so normal hover/state
//      transitions are unaffected.
// Skipped entirely when the user prefers reduced motion.
const withThemeTransition = (apply) => {
  if (typeof document === 'undefined') { apply(); return; }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply();
    return;
  }

  // Preferred path — native crossfade of the whole page.
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(apply);
    return;
  }

  // Fallback — temporarily enable color transitions on all elements.
  const root = document.documentElement;
  root.classList.add('theme-transitioning');
  apply();
  window.setTimeout(() => root.classList.remove('theme-transitioning'), THEME_TRANSITION_MS);
};

const initialTheme = resolveInitialTheme();

const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  // Whether the current theme came from an explicit user choice (vs. the OS).
  isExplicit: loadStoredTheme() !== null,

  setTheme: (theme) => {
    // Wrap only the DOM class change in the gentle transition — state and
    // persistence update immediately so the toggle feels responsive.
    withThemeTransition(() => applyTheme(theme));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
    set({ theme, isExplicit: true });

    // Persist to the user's account (per-user preference) if authenticated.
    // Fire-and-forget — localStorage above is the immediate fallback.
    persistThemeToServer(theme);
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },

  // Apply the resolved theme on app boot (idempotent with the no-FOUC script).
  initTheme: () => {
    const theme = resolveInitialTheme();
    applyTheme(theme);
    set({ theme, isExplicit: loadStoredTheme() !== null });
  },

  // Apply the theme from the authenticated user's saved preferences.
  // Called after checkAuth/login resolves. If the user has a theme preference
  // stored in their account, it overrides the localStorage/OS default.
  applyUserTheme: (preferences) => {
    if (!preferences || !preferences.theme) return;
    const theme = preferences.theme;
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
    set({ theme, isExplicit: true });
  },

  // Re-apply the theme when the route changes (SPA navigation between
  // public and admin routes). Public routes are forced light.
  syncThemeForPath: (path) => {
    applyTheme(get().theme, path);
  },
}));

// Persist the theme to the user's account via the API. No-op if not
// authenticated (the 401 is silently ignored — localStorage is the fallback).
let persistInFlight = false;
const persistThemeToServer = (theme) => {
  if (persistInFlight) return;
  persistInFlight = true;
  api.put('/auth/preferences', { theme })
    .catch(() => { /* not authenticated or network error — fine */ })
    .finally(() => { persistInFlight = false; });
};

// Apply immediately at module load so React renders with the right theme.
applyTheme(initialTheme);

if (typeof window !== 'undefined') {
  // Follow OS changes only while the user hasn't made an explicit choice.
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = (e) => {
    if (useThemeStore.getState().isExplicit) return;
    const theme = e.matches ? 'dark' : 'light';
    applyTheme(theme);
    useThemeStore.setState({ theme });
  };
  if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);

  // Sync explicit choices across tabs.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyTheme(e.newValue);
      useThemeStore.setState({ theme: e.newValue, isExplicit: true });
    }
  });
}

export default useThemeStore;
