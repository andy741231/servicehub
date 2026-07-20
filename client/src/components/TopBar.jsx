import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Menu, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import GlobalSearch from './GlobalSearch';

// ── Theme toggle (switch row, used inside the user dropdown) ───────────────
function ThemeToggleRow() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={isDark}
      onClick={toggleTheme}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-muted hover:bg-surface-raised hover:text-text-base transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <span className="flex items-center gap-2">
        {isDark ? <Moon className="w-4 h-4 flex-shrink-0" /> : <Sun className="w-4 h-4 flex-shrink-0" />}
        Dark mode
      </span>
      {/* Switch track + knob */}
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${
          isDark ? 'bg-primary' : 'bg-surface-tertiary'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isDark ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

// ── Context ──────────────────────────────────────────────────────────────
// Sub-apps register their tabs and optional actions (e.g. "View site") here.
// Split from the auth store per ui-ux-pro-max guideline #33 (split contexts
// by concern). Context value is memoized (#34) and setters wrapped in
// useCallback (#12) to avoid unnecessary re-renders of consumers.
const TopBarContext = createContext(null);

export function TopBarProvider({ children }) {
  const [actions, setActions] = useState(null);
  const [title, setTitle] = useState('');

  // Stable setters so sub-app useEffect deps don't churn on every render.
  const registerActions = useCallback((next) => setActions(next), []);
  const registerTitle = useCallback((next) => setTitle(next ?? ''), []);

  const value = useMemo(
    () => ({ actions, title, registerActions, registerTitle }),
    [actions, title, registerActions, registerTitle]
  );

  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

// Sub-app shells call this to push their tabs/actions into the global TopBar.
// Returns setters that are safe to use inside useEffect dependencies.
export function useTopBar() {
  const ctx = useContext(TopBarContext);
  if (!ctx) throw new Error('useTopBar must be used within TopBarProvider');
  return ctx;
}

// ── User dropdown ─────────────────────────────────────────────────────────
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  // Close on Escape (ui-ux-pro-max #41 keyboard navigation — no traps).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    if (onLogout) onLogout();
    else navigate('/hub-admin');
  };

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 min-h-[44px] rounded-base text-sm font-medium text-muted hover:bg-surface-raised hover:text-text-base transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight min-w-0 max-w-[160px]">
          <span className="text-sm font-medium text-text-base truncate w-full text-left">{user?.name}</span>
          <span className="text-xs text-subtle truncate w-full text-left">{user?.email}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Outside-click overlay (z-40) — menu sits above (z-50) per #15 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-50 w-56 bg-surface border border-border rounded-base shadow-dropdown py-1"
          >
            <div className="px-3 py-2 border-b border-border-soft sm:hidden">
              <p className="text-sm font-medium text-text-base truncate">{user?.name}</p>
              <p className="text-xs text-subtle truncate">{user?.email}</p>
            </div>
            <ThemeToggleRow />
            <div className="h-px bg-border-soft my-1" />
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/hub-admin/settings'); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-muted hover:bg-surface-raised hover:text-text-base transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <SettingsIcon className="w-4 h-4 flex-shrink-0" />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm font-medium text-muted hover:bg-surface-raised hover:text-text-base transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── TopBar ───────────────────────────────────────────────────────────────
export default function TopBar({ onMenuClick }) {
  const { actions, title } = useTopBar();
  const { user } = useAuthStore();

  return (
    <header className="bg-surface border-b border-border flex items-center gap-3 px-3 sm:px-6 h-14 shrink-0 z-50">
      {/* Left: hamburger (mobile) + sub-app title */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-base text-text-base hover:bg-surface-raised transition-colors flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      {title ? (
        <h1 className="text-base font-semibold text-text-base truncate flex-shrink-0 hidden sm:block">{title}</h1>
      ) : null}

      {/* Center: global search (hidden on mobile, visible on sm+) */}
      <div className="hidden sm:flex flex-1 justify-center max-w-md mx-auto">
        <GlobalSearch />
      </div>

      {/* Right: sub-app actions + shared user menu (theme toggle lives inside) */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {actions}
        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
