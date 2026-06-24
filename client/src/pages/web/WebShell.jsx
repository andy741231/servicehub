import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FileText, Layout, Palette, Image, ExternalLink } from 'lucide-react';

const TABS = [
  { label: 'Pages',          path: '/hub-admin/web/pages',          Icon: FileText },
  { label: 'Header & Footer', path: '/hub-admin/web/header-footer',  Icon: Layout   },
  { label: 'Styles',         path: '/hub-admin/web/styles',         Icon: Palette  },
  { label: 'Assets',         path: '/hub-admin/web/assets',         Icon: Image    },
];

export default function WebShell() {
  const location = useLocation();

  // Don't render the shell chrome for the editor route
  const isEditor = location.pathname.includes('/web/editor/');
  if (isEditor) return <Outlet />;

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View site
        </a>
      </div>

      {/* Sub-page content — full width */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
