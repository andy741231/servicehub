import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LogOut, Globe, ClipboardList, Mail, Users, ChevronDown, ChevronRight, FileText, Palette, Image, Layout } from 'lucide-react';
import { APP_IDS } from 'shared';

// Web Builder sub-menu items
const WEB_SUB_ITEMS = [
  { label: 'Pages',          path: '/hub-admin/web/pages',          Icon: FileText },
  { label: 'Header & Footer', path: '/hub-admin/web/header-footer',  Icon: Layout   },
  { label: 'Styles',         path: '/hub-admin/web/styles',         Icon: Palette  },
  { label: 'Assets',         path: '/hub-admin/web/assets',         Icon: Image    },
];

export const APPS = [
  { id: APP_IDS.WEB,   label: 'Website',      path: '/hub-admin/web',        Icon: Globe,         sub: WEB_SUB_ITEMS },
  { id: APP_IDS.FORMS, label: 'Form Builder',  path: '/hub-admin/forms',      Icon: ClipboardList, sub: null },
  { id: APP_IDS.EMAIL, label: 'Email Sender',  path: '/hub-admin/email',      Icon: Mail,          sub: null },
];

function NavItem({ app, location }) {
  const isRootActive  = location.pathname === app.path;
  const isSubActive   = app.sub?.some(s => location.pathname.startsWith(s.path));
  const isActive      = isRootActive || isSubActive;

  // Web Builder: always show sub-items expanded when on any /web path
  const [open, setOpen] = useState(isActive);

  if (app.sub) {
    return (
      <div>
        {/* Parent row — label is a link, chevron toggles sub-items */}
        <div className={`flex items-center justify-between rounded-md transition-colors ${
          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}>
          <Link
            to={app.path}
            className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium ${
              isActive ? 'text-blue-700' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <app.Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
            {app.label}
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="px-2 py-2 text-gray-400 hover:text-gray-600"
            title={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Sub-items */}
        {open && (
          <div className="mt-0.5 ml-8 space-y-0.5">
            {app.sub.map(({ label, path, Icon }) => {
              const active = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    active
                      ? 'text-blue-700 font-medium bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-blue-500' : 'text-gray-400'}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={app.path}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <app.Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
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

  const hasAdminRole = user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-600">Service Hub</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <nav className="px-3 space-y-0.5">
            {APPS.map((app) => {
              const hasAccess = user?.permissions?.includes(app.id) || hasAdminRole;
              if (!hasAccess) return null;
              return <NavItem key={app.id} app={app} location={location} />;
            })}

            {hasAdminRole && (
              <div className="pt-3 mt-3 border-t border-gray-200">
                <Link
                  to="/hub-admin/admin/users"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname.startsWith('/hub-admin/admin')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className={`mr-3 h-5 w-5 ${location.pathname.startsWith('/hub-admin/admin') ? 'text-blue-500' : 'text-gray-400'}`} />
                  Users & Roles
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="ml-2 p-2 text-gray-400 hover:text-gray-600 flex-shrink-0" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
