import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { APPS } from '../../layouts/AppShell';

function getFirstAccessiblePath(user) {
  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');
  const accessibleApp = APPS.find((app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole);
  console.log('User:', user);
  console.log('Has admin role:', hasAdminRole);
  console.log('Permissions:', user?.permissions);
  console.log('Accessible app:', accessibleApp);
  console.log('Redirecting to:', accessibleApp?.path || '/hub-admin');
  return accessibleApp?.path || '/hub-admin';
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

  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return <Navigate to={getFirstAccessiblePath(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password, rememberMe);
      const updatedUser = useAuthStore.getState().user;
      navigate(getFirstAccessiblePath(updatedUser));
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div>
      <div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && <div role="alert" aria-live="polite" className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <input
              type="text"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Trust this computer, remember me
          </label>
        </div>
        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
