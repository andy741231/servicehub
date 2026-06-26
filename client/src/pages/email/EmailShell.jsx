import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Mail, UserPlus, FileText } from 'lucide-react';

const TABS = [
  { label: 'Campaigns',      path: '/hub-admin/email',          Icon: Mail     },
  { label: 'Mailing Lists',  path: '/hub-admin/email/lists',    Icon: UserPlus },
  { label: 'Templates',      path: '/hub-admin/email/templates', Icon: FileText },
];

export default function EmailShell() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-surface border-b border-border px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0">
          {TABS.map(({ label, path, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-5 py-4 text-body font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-base hover:border-border-dark'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Sub-page content — full width */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
