import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { LogIn, Lock, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import LoadingScreen from '../../components/LoadingScreen';
import { APPS } from '../../layouts/AppShell';

function getAccessibleApps(user) {
  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');
  return APPS.filter((app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole);
}

// Any accessible apps → land on the welcome page.
// Zero apps → fall back to /hub-admin (login page).
function getPostLoginPath(user) {
  const apps = getAccessibleApps(user);
  if (apps.length >= 1) return '/hub-admin/welcome';
  return '/hub-admin';
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();

  if (isLoading) return <LoadingScreen label="Signing in" />;
  if (isAuthenticated) return <Navigate to={getPostLoginPath(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password, rememberMe);
      const updatedUser = useAuthStore.getState().user;
      navigate(getPostLoginPath(updatedUser));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-text-base">Sign in to Service Hub</h2>
        <p className="text-sm text-muted mt-1">Enter your credentials to access the admin dashboard.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" aria-live="polite" className="text-sm text-danger text-center bg-danger-light border border-danger/10 p-3 rounded-base">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-label text-muted mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle min-h-[44px]"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-label text-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle min-h-[44px]"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-muted cursor-pointer">
            Trust this computer, remember me
          </label>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-base text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary min-h-[44px]"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
