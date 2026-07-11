import { useState, useCallback, useEffect, useMemo } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import {
  Globe, ClipboardList, Mail, Users, BookOpen, LayoutDashboard, X,
  ChevronRight, ChevronDown, Gauge, Files, PanelTop, Palette, Images, FileStack,
  Wrench, Inbox, BarChart3, Copy, UserPlus, FileText,
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
      { label: 'Mailing Lists', path: '/hub-admin/email/lists',     Icon: UserPlus },
      { label: 'Templates',     path: '/hub-admin/email/templates', Icon: FileText },
    ],
  },
  {
    id: APP_IDS.DIRECTORY, label: 'Directory', path: '/hub-admin/directory/dashboard', Icon: BookOpen,
    children: [
      { label: 'Dashboard', path: '/hub-admin/directory/dashboard', Icon: Gauge },
      { label: 'Browse',    path: '/hub-admin/directory/browse',    Icon: BookOpen },
    ],
  },
  {
    id: APP_IDS.PORTAL, label: 'Portal', path: '/hub-admin/portal/dashboard', Icon: LayoutDashboard,
    children: [
      { label: 'Dashboard', path: '/hub-admin/portal/dashboard', Icon: Gauge },
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

// ── Drill-down sidebar ───────────────────────────────────────────────────
// A stack of frames drives the visible level. Empty stack = root (app list).
// One frame = drilled into that app, showing its section children.
function DrilldownSidebar({ accessibleApps, location, closeSidebar, hasSuperAdminRole }) {
  const [stack, setStack] = useState([]); // [{ id, label }]
  const [direction, setDirection] = useState('forward'); // 'forward' | 'back'

  // Auto-drill into the app that owns the current route. On navigation, if the
  // current stack top doesn't match the active app, drill into it so the user
  // always sees their current location's context.
  useEffect(() => {
    const id = activeAppId(location.pathname);
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (id && top?.id === id) return prev;          // already drilled in
      if (!id && prev.length === 0) return prev;       // at root, no active app
      const app = APPS.find((a) => a.id === id);
      if (!app) return [];                             // non-app route (admin) → root
      setDirection('forward');
      return [{ id: app.id, label: app.label }];
    });
  }, [location.pathname]);

  const drillIn = useCallback((app) => {
    setDirection('forward');
    setStack([{ id: app.id, label: app.label }]);
  }, []);

  // The currently visible level's items.
  const currentFrame = stack[stack.length - 1] ?? null;
  const currentApp = currentFrame ? APPS.find((a) => a.id === currentFrame.id) : null;
  const currentItems = currentApp ? currentApp.children : null;
  // Animation key — changes whenever the visible level changes, re-triggering CSS.
  const animKey = currentFrame ? `app-${currentFrame.id}` : 'root';

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
            // Drilled into an app — render its section children as leaf links
            currentItems.map((child) => (
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
            ))
          ) : (
            // Root level — render accessible apps as parent rows + admin link
            <>
              {accessibleApps.map((app) => {
                const isParentActive = isAppActive(app.id, location.pathname);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => drillIn(app)}
                    className={`w-full flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 text-left ${
                      isParentActive
                        ? 'text-primary font-semibold'
                        : 'text-muted hover:bg-surface-raised hover:text-base'
                    }`}
                  >
                    <app.Icon className={`h-5 w-5 flex-shrink-0 ${isParentActive ? 'text-primary' : 'text-subtle'}`} />
                    <span className="flex-1 truncate">{app.label}</span>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isParentActive ? 'text-primary' : 'text-subtle'}`} />
                  </button>
                );
              })}

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
        className={`fixed lg:sticky top-0 left-0 h-screen w-[240px] bg-surface border-r border-border flex flex-col z-[60] transition-transform duration-200 ease-out lg:translate-x-0 lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand row */}
        <div className="h-14 flex items-center px-6 border-b border-border shrink-0">
          <Link to="/hub-admin/" onClick={closeSidebar} className="text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-base transition-colors duration-150">
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
