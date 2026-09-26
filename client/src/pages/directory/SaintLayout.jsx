import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, IdCard, LogOut } from 'lucide-react';
import useDirectoryStore from './store/directoryStore';

// Minimal saint-facing shell: brand + browse + my profile + sign out.
// No hub sidebar — staff manage via the Cards/Table toggle on Browse itself.
export default function SaintLayout() {
  const session = useDirectoryStore((s) => s.session);
  const logout = useDirectoryStore((s) => s.logout);
  const navigate = useNavigate();
  const name = session ? `${session.member.firstName} ${session.member.lastName}` : '';

  const handleLogout = async () => {
    await logout();
    navigate('/directory/login');
  };

  const navCls = ({ isActive }) =>
    `px-3 py-2.5 min-h-[44px] rounded-base text-sm font-medium transition-colors flex items-center gap-1.5 ${
      isActive ? 'bg-primary-light text-primary' : 'text-muted hover:text-text-base hover:bg-surface-raised'
    }`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 font-bold text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
            <span className="hidden sm:inline">Church Directory</span>
            <span className="sm:hidden">Directory</span>
          </div>

          <nav className="flex items-center gap-1 ml-1 sm:ml-4">
            <NavLink to="/directory" end className={navCls}>
              Browse
            </NavLink>
            <NavLink to="/directory/me" className={navCls}>
              <IdCard className="h-4 w-4" /> Profile
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-sm text-muted hidden md:inline truncate max-w-[140px]">{name}</span>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-sm font-medium text-muted hover:text-text-base hover:bg-surface-raised rounded-base transition-colors"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
