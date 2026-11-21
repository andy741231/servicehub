import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import {
  Globe, ClipboardList, Mail, Users, BookOpen, LayoutDashboard, X,
  ChevronRight, ChevronLeft, ChevronDown, Gauge, Files, PanelTop, Palette, Images, FileStack,
  Wrench, Inbox, BarChart3, Copy, UserPlus, FileText, Send, IdCard,
} from 'lucide-react';
import { APP_IDS } from 'shared';
import useAuthStore from '../store/authStore';
import LoggedOutBanner from '../components/LoggedOutBanner';
import TopBar, { TopBarProvider } from '../components/TopBar';

export const APPS = [
  {
    id: APP_IDS.WEB, label: 'Website', path: '/hub-admin/web/dashboard', Icon: Globe,
    children: [
      { label: 'Dashboard',       path: '/hub-admin/web/dashboard',     Icon: Gauge },
      { label: 'Pages',           path: '/hub-admin/web/pages',         Icon: Files },
      { label: 'Header & Footer', path: '/hub-admin/web/header-footer', Icon: PanelTop },
      { label: 'Styles',          path: '/hub-admin/web/styles',        Icon: Palette },
      { label: 'Assets',          path: '/hub-admin/web/assets',        Icon: Images },
      { label: 'Draft Templates', path: '/hub-admin/web/templates',     Icon: FileStack },
      { label: 'Page Templates',  path: '/hub-admin/web/page-templates', Icon: Copy },
    ],
  },
  {
    id: APP_IDS.FORMS, label: 'Form Builder', path: '/hub-admin/forms/dashboard', Icon: ClipboardList,
    children: [
      { label: 'Dashboard',   path: '/hub-admin/forms/dashboard',   Icon: Gauge },
      { label: 'Forms',       path: '/hub-admin/forms/list',       Icon: ClipboardList },
      { label: 'Builder',     path: '/hub-admin/forms/builder',    Icon: Wrench },
      { label: 'Submissions', path: '/hub-admin/forms/submissions', Icon: Inbox },
      { label: 'Analytics',   path: '/hub-admin/forms/analytics',  Icon: BarChart3 },
      { label: 'Templates',   path: '/hub-admin/forms/templates',  Icon: Copy },
    ],
  },
  {
    id: APP_IDS.EMAIL, label: 'Email Sender', path: '/hub-admin/email/dashboard', Icon: Mail,
    children: [
      { label: 'Dashboard',     path: '/hub-admin/email/dashboard', Icon: Gauge },
      { label: 'Campaigns',     path: '/hub-admin/email/campaigns', Icon: Mail },
      { label: 'Builder',       path: '/hub-admin/email/builder',   Icon: Wrench },
      { label: 'Mailing Lists', path: '/hub-admin/email/lists',     Icon: UserPlus },
      { label: 'Test Email',    path: '/hub-admin/email/test',      Icon: Send },
      { label: 'Templates',     path: '/hub-admin/email/templates', Icon: FileText },
    ],
  },
  {
    id: APP_IDS.DIRECTORY, label: 'Directory', path: '/hub-admin/directory/dashboard', Icon: BookOpen,
    children: [
      { label: 'Dashboard',  path: '/hub-admin/directory/dashboard', Icon: Gauge },
      { label: 'Browse',     path: '/hub-admin/directory/browse',    Icon: BookOpen },
      { label: 'My Profile', path: '/hub-admin/directory/me',        Icon: IdCard },
    ],
  },
  {
    id: APP_IDS.PORTAL, label: 'Portal', path: '/hub-admin/portal/dashboard', Icon: LayoutDashboard,
    children: [
      { label: 'Dashboard',              path: '/hub-admin/portal/dashboard',              Icon: Gauge },
      { label: 'Payment Reconciliation', path: '/hub-admin/portal/payment-reconciliation', Icon: Inbox },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────
function isAppActive(appId, pathname) {
  return pathname.startsWith(`/hub-admin/${appId}`);
}

function activeAppId(pathname) {
  return APPS.find((app) => isAppActive(app.id, pathname))?.id ?? null;
}

// Small uppercase group label used at the root level ("Apps", "Admin").
function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-subtle select-none">
      {children}
    </p>
  );
}

// ── Drill-down sidebar ───────────────────────────────────────────────────
// Empty stack = root (app list). One frame = drilled into that app, showing a
// "← All apps" back row, the app title, and its section links.
//
// Drilling in/out only changes what the sidebar shows; it never navigates.
// Navigation auto-drills into whichever app owns the new route.
function DrilldownSidebar({ accessibleApps, location, closeSidebar, hasSuperAdminRole }) {
  const [stack, setStack] = useState([]); // [{ id, label }]
  const [direction, setDirection] = useState('forward'); // 'forward' | 'back'

  // Focus management: the clicked control unmounts when the level swaps, so
  // move focus to the logical next control (back button / originating app row).
  // Only set by user actions, so route-driven drills never steal focus.
  const focusTarget = useRef(null);
  const backRef = useRef(null);
  const appRowRefs = useRef({});

  // Auto-drill into the app that owns the current route.
  useEffect(() => {
    const id = activeAppId(location.pathname);
    const app = id ? APPS.find((a) => a.id === id) : null;
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (app && top?.id === app.id) return prev;      // already drilled in
      if (!app) return prev.length === 0 ? prev : [];  // non-app route → root
      return [{ id: app.id, label: app.label }];
    });
    setDirection('forward');
  }, [location.pathname]);

  const drillIn = useCallback((app) => {
    focusTarget.current = 'back';
    setDirection('forward');
    setStack([{ id: app.id, label: app.label }]);
  }, []);

  // The currently visible level's items.
  const currentFrame = stack[stack.length - 1] ?? null;
  const currentApp = currentFrame ? APPS.find((a) => a.id === currentFrame.id) : null;
  const currentItems = currentApp ? currentApp.children : null;
  // Animation key — changes whenever the visible level changes, re-triggering CSS.
  const animKey = currentFrame ? `app-${currentFrame.id}` : 'root';

  const goBack = useCallback(() => {
    focusTarget.current = currentFrame?.id ?? null;
    setDirection('back');
    setStack([]);
  }, [currentFrame]);

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    if (target === 'back') backRef.current?.focus();
    else appRowRefs.current[target]?.focus();
  }, [animKey]);

  return (
    <>
      {/* Drill-down list — key + animation class re-trigger on level change */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav
          key={animKey}
          aria-label={currentFrame ? `${currentFrame.label} sections` : 'Applications'}
          className={`px-2 space-y-0.5 ${direction === 'forward' ? 'drill-enter-forward' : 'drill-enter-back'}`}
        >
          {currentItems ? (
            <>
            {/* Level header: explicit way back up + where you are */}
            <div className="pb-2 mb-1 border-b border-border-soft">
              <button
                ref={backRef}
                type="button"
                onClick={goBack}
                aria-label="Back to all apps"
                className="flex items-center gap-1 pl-1.5 pr-2.5 min-h-[36px] text-sm font-medium text-muted rounded-base hover:bg-surface-raised hover:text-text-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                All apps
              </button>
              <h2 className="flex items-center gap-3 px-3 pt-1.5 text-body font-semibold text-text-base">
                <currentApp.Icon className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{currentApp.label}</span>
              </h2>
            </div>

            {/* Section links */}
            {currentItems.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    isActive
                      ? 'bg-primary-light text-primary font-semibold'
                      : 'text-muted hover:bg-surface-raised hover:text-base'
                  }`
                }
              >
                {child.Icon && (
                  <child.Icon className={`h-5 w-5 flex-shrink-0 ${location.pathname === child.path ? 'text-primary' : 'text-subtle'}`} />
                )}
                <span className="truncate">{child.label}</span>
              </NavLink>
            ))}
            </>
          ) : (
            // Root level — render accessible apps as parent rows + admin link
            <>
              <SectionLabel>Apps</SectionLabel>
              {accessibleApps.map((app) => {
                const isParentActive = isAppActive(app.id, location.pathname);
                return (
                  <button
                    key={app.id}
                    ref={(el) => { appRowRefs.current[app.id] = el; }}
                    type="button"
                    onClick={() => drillIn(app)}
                    aria-label={`${app.label}${isParentActive ? ' (current)' : ''} — show sections`}
                    className={`group w-full flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 text-left ${
                      isParentActive
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-muted hover:bg-surface-raised hover:text-base'
                    }`}
                  >
                    <app.Icon className={`h-5 w-5 flex-shrink-0 ${isParentActive ? 'text-primary' : 'text-subtle'}`} />
                    <span className="flex-1 truncate">{app.label}</span>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 ease-out group-hover:translate-x-0.5 ${isParentActive ? 'text-primary' : 'text-subtle'}`} />
                  </button>
                );
              })}

              {hasSuperAdminRole && (
                <>
                  <div className="pt-3" />
                  <SectionLabel>Admin</SectionLabel>
                  <NavLink
                    to="/hub-admin/admin/users"
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                        isActive
                          ? 'bg-primary-light text-primary font-semibold'
                          : 'text-muted hover:bg-surface-raised hover:text-base'
                      }`
                    }
                  >
                    <Users className="h-5 w-5 flex-shrink-0 text-subtle" />
                    <span className="flex-1">Users &amp; Roles</span>
                  </NavLink>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </>
  );
}

// ── Accordion sidebar (single-app access) ────────────────────────────────
// The one accessible app shows as a parent row that expands/collapses inline,
// revealing its children below. No stack navigation or Back button needed.
function AccordionSidebar({ accessibleApps, location, closeSidebar, hasSuperAdminRole }) {
  const app = accessibleApps[0];
  const panelId = `accordion-${app.id}`;
  const [expanded, setExpanded] = useState(() => isAppActive(app.id, location.pathname));
  const isParentActive = isAppActive(app.id, location.pathname);

  return (
    <div className="flex-1 overflow-y-auto py-2">
      <nav aria-label={`${app.label} sections`} className="px-2 space-y-0.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className={`w-full flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 text-left ${
            isParentActive
              ? 'text-primary font-semibold'
              : 'text-muted hover:bg-surface-raised hover:text-base'
          }`}
        >
          <app.Icon className={`h-5 w-5 flex-shrink-0 ${isParentActive ? 'text-primary' : 'text-subtle'}`} />
          <span className="flex-1 truncate">{app.label}</span>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ease-out ${isParentActive ? 'text-primary' : 'text-subtle'} ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div id={panelId} className="space-y-0.5 pt-0.5">
            {app.children.map((child) => {
              const isChildActive = location.pathname === child.path;
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 pl-11 pr-3 min-h-[36px] text-body rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      isActive
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-muted hover:bg-surface-raised hover:text-base'
                    }`
                  }
                >
                  {child.Icon && (
                    <child.Icon className={`h-4 w-4 flex-shrink-0 ${isChildActive ? 'text-primary' : 'text-subtle'}`} />
                  )}
                  <span className="truncate">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {hasSuperAdminRole && (
          <>
            <div className="pt-3 mt-3 border-t border-border mx-1" />
            <NavLink
              to="/hub-admin/admin/users"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  isActive
                    ? 'bg-primary-light text-primary font-semibold'
                    : 'text-muted hover:bg-surface-raised hover:text-base'
                }`
              }
            >
              <Users className="h-5 w-5 flex-shrink-0 text-subtle" />
              <span className="flex-1">Users &amp; Roles</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}

function AppShell() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  const accessibleApps = useMemo(
    () => APPS.filter((app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole),
    [user, hasAdminRole, hasSuperAdminRole],
  );

  const useAccordion = accessibleApps.length === 1;

  return (
    <div className="min-h-screen bg-background flex">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[55] lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — 240px navigation on desktop per THEME.md */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`fixed lg:sticky top-0 left-0 h-screen w-[280px] bg-surface border-r border-border flex flex-col z-[60] transition-transform duration-200 ease-out lg:translate-x-0 lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand row — fixed h-14 so it lines up with the TopBar border.
            Current-app context lives in the drill-down level header instead. */}
        <div className="px-6 border-b border-border shrink-0 h-14 flex items-center">
          <div className="flex items-center w-full">
            <Link
              to="/hub-admin/"
              onClick={closeSidebar}
              className="text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-base transition-colors duration-150 shrink-0"
            >
              Service Hub
            </Link>
            <button
              onClick={closeSidebar}
              className="ml-auto lg:hidden p-2 rounded-base text-muted hover:bg-surface-raised hover:text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {useAccordion ? (
          <AccordionSidebar
            accessibleApps={accessibleApps}
            location={location}
            closeSidebar={closeSidebar}
            hasSuperAdminRole={hasSuperAdminRole}
          />
        ) : (
          <DrilldownSidebar
            accessibleApps={accessibleApps}
            location={location}
            closeSidebar={closeSidebar}
            hasSuperAdminRole={hasSuperAdminRole}
          />
        )}
      </aside>

      {/* Main content — global TopBar + sub-app outlet */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBarProvider>
          <LoggedOutBanner />
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main id="main-content" role="main" className="flex-1 overflow-y-auto bg-background animate-page-in">
            <Outlet />
          </main>
        </TopBarProvider>
      </div>
    </div>
  );
}

export default AppShell;
