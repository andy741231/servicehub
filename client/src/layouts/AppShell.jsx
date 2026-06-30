import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LogOut, Globe, ClipboardList, Mail, Users, BookOpen, LayoutDashboard } from 'lucide-react';
import { APP_IDS } from 'shared';
import LoggedOutBanner from '../components/LoggedOutBanner';

export const APPS = [
  { id: APP_IDS.WEB,       label: 'Website',      path: '/hub-admin/web/pages',  Icon: Globe,         sub: null },
  { id: APP_IDS.FORMS,     label: 'Form Builder',  path: '/hub-admin/forms',      Icon: ClipboardList, sub: null },
  { id: APP_IDS.EMAIL,     label: 'Email Sender',  path: '/hub-admin/email',      Icon: Mail,          sub: null },
  { id: APP_IDS.DIRECTORY, label: 'Directory',     path: '/hub-admin/directory',  Icon: BookOpen,      sub: null },
  { id: APP_IDS.PORTAL,    label: 'Portal',        path: '/hub-admin/portal',     Icon: LayoutDashboard, sub: null },
];

function NavItem({ app, location }) {
  // For Website, treat any /hub-admin/web/* path as active
  // For Email, treat any /hub-admin/email/* path as active
  const isActive =
    app.id === 'web'
      ? location.pathname.startsWith('/hub-admin/web')
      : app.id === 'email'
      ? location.pathname.startsWith('/hub-admin/email')
      : location.pathname === app.path;

  return (
    <Link
      to={app.path}
      className={`flex items-center gap-3 px-3 py-2.5 text-body font-medium rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
        isActive ? 'bg-primary-light text-primary' : 'text-muted hover:bg-surface-raised hover:text-base'
      }`}
    >
      <app.Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-subtle'}`} />
      {app.label}
    </Link>
  );
}

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/hub-admin');
  };

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-[240px] bg-surface border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-6 border-b border-border">
          <Link to="/hub-admin/" className="text-lg font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-base transition-colors duration-150">
            Service Hub
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {APPS.map((app) => {
              const hasAccess = user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole;
              if (!hasAccess) return null;
              return <NavItem key={app.id} app={app} location={location} />;
            })}

            {hasSuperAdminRole && (
              <div className="pt-4 mt-4 border-t border-border">
                <Link
                  to="/hub-admin/admin/users"
                  className={`flex items-center gap-3 px-3 py-2.5 text-body font-medium rounded-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                    location.pathname.startsWith('/hub-admin/admin')
                      ? 'bg-primary-light text-primary'
                      : 'text-muted hover:bg-surface-raised hover:text-base'
                  }`}
                >
                  <Users className={`h-5 w-5 flex-shrink-0 ${location.pathname.startsWith('/hub-admin/admin') ? 'text-primary' : 'text-subtle'}`} />
                  Users & Roles
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-body font-medium text-base truncate">{user?.name}</p>
            <p className="text-small text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="ml-2 p-3 min-w-[44px] min-h-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors duration-150 flex-shrink-0" aria-label="Logout" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <LoggedOutBanner />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
