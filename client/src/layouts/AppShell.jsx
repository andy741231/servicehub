import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LogOut, Globe, ClipboardList, Mail, Users } from 'lucide-react';
import { APP_IDS } from 'shared';

const ICONS = {
  [APP_IDS.WEB]: Globe,
  [APP_IDS.FORMS]: ClipboardList,
  [APP_IDS.EMAIL]: Mail,
};

// We will fetch the app config directly or define here for now based on the blueprint
export const APPS = [
  { id: APP_IDS.WEB, label: 'Web Builder', path: '/web', icon: Globe },
  { id: APP_IDS.FORMS, label: 'Form Builder', path: '/web/forms', icon: ClipboardList },
  { id: APP_IDS.EMAIL, label: 'Email Sender', path: '/web/email', icon: Mail },
];

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/web/login');
  };

  const hasAdminRole = user?.roles?.includes('admin');

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Service Hub</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-1">
            {APPS.map((app) => {
              const hasAccess = user?.permissions?.includes(app.id) || hasAdminRole;
              if (!hasAccess) return null;
              
              const Icon = app.icon;
              const isActive = location.pathname === app.path || location.pathname.startsWith(`${app.path}/`);
              
              return (
                <Link
                  key={app.id}
                  to={app.path}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {app.label}
                </Link>
              );
            })}

            {hasAdminRole && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  to="/web/admin/users"
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    location.pathname.startsWith('/web/admin') ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Users className={`mr-3 h-5 w-5 ${location.pathname.startsWith('/web/admin') ? 'text-blue-500' : 'text-gray-400'}`} />
                  Users & Roles
                </Link>
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center truncate">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
