import { useState, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Globe, ClipboardList, Mail, Users, BookOpen, LayoutDashboard, Menu, X } from 'lucide-react';
import { APP_IDS } from 'shared';
import LoggedOutBanner from '../components/LoggedOutBanner';
import TopBar, { TopBarProvider } from '../components/TopBar';

export const APPS = [
  { id: APP_IDS.WEB,       label: 'Website',      path: '/hub-admin/web/dashboard',  Icon: Globe,         sub: null },
  { id: APP_IDS.FORMS,     label: 'Form Builder',  path: '/hub-admin/forms/dashboard', Icon: ClipboardList, sub: null },
  { id: APP_IDS.EMAIL,     label: 'Email Sender',  path: '/hub-admin/email/dashboard', Icon: Mail,          sub: null },
  { id: APP_IDS.DIRECTORY, label: 'Directory',     path: '/hub-admin/directory/dashboard', Icon: BookOpen,      sub: null },
  { id: APP_IDS.PORTAL,    label: 'Portal',        path: '/hub-admin/portal/dashboard',    Icon: LayoutDashboard, sub: null },
];

function NavItem({ app, location, onNavigate }) {
  const isActive =
    app.id === 'web'
      ? location.pathname.startsWith('/hub-admin/web')
      : app.id === 'email'
      ? location.pathname.startsWith('/hub-admin/email')
      : app.id === 'forms'
      ? location.pathname.startsWith('/hub-admin/forms')
      : app.id === 'directory'
      ? location.pathname.startsWith('/hub-admin/directory')
      : app.id === 'portal'
      ? location.pathname.startsWith('/hub-admin/portal')
      : location.pathname === app.path;

  return (
    <Link
      to={app.path}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
        isActive ? 'bg-primary-light text-primary font-semibold' : 'text-muted hover:bg-surface-raised hover:text-base'
      }`}
    >
      <app.Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-subtle'}`} />
      <span>{app.label}</span>
    </Link>
  );
}

export default function AppShell() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-base focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — 240px labeled navigation on desktop per THEME.md */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`fixed lg:sticky top-0 left-0 h-screen w-[240px] bg-surface border-r border-border flex flex-col z-50 transition-transform duration-200 ease-out lg:translate-x-0 lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 flex items-center px-6 border-b border-border">
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

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1" aria-label="Applications">
            {APPS.map((app) => {
              const hasAccess = user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole;
              if (!hasAccess) return null;
              return <NavItem key={app.id} app={app} location={location} onNavigate={closeSidebar} />;
            })}

            {hasSuperAdminRole && (
              <>
                <div className="pt-4 mt-4 border-t border-border mx-3" />
                <div className="px-3 pb-1 pt-3 text-xs font-medium text-subtle uppercase tracking-wider">Administration</div>
                <Link
                  to="/hub-admin/admin/users"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-3 min-h-[44px] text-body font-medium rounded-base transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    location.pathname.startsWith('/hub-admin/admin')
                      ? 'bg-primary-light text-primary font-semibold'
                      : 'text-muted hover:bg-surface-raised hover:text-base'
                  }`}
                >
                  <Users className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/hub-admin/admin') ? 'text-primary' : 'text-subtle'}`} />
                  <span>Users &amp; Roles</span>
                </Link>
              </>
            )}
          </nav>
        </div>
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
