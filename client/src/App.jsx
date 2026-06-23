import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AuthLayout from './layouts/AuthLayout';
import AppShell from './layouts/AppShell';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Users from './pages/admin/Users';
import WebIndex from './pages/web/index';
import WebPages from './pages/web/Pages';
import WebStyles from './pages/web/Styles';
import WebAssets from './pages/web/Assets';
import WebHeaderFooter from './pages/web/HeaderFooter';
import PublicHome from './pages/public/Home';
import SessionExpiredModal from './components/SessionExpiredModal';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/hub-admin" />;
  return children;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SessionExpiredModal />
      <Routes>
        {/* ── Public site routes ── */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/:slug" element={<PublicHome />} />

        {/* ── Admin backend (/hub-admin/*) ── */}
        <Route path="/hub-admin">
          {/* Login / Register at /hub-admin and /hub-admin/register */}
          <Route element={<AuthLayout />}>
            <Route index         element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          {/* Protected sub-apps */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            {/* Web builder */}
            <Route path="web"              element={<WebIndex />} />
            <Route path="web/pages"         element={<WebPages />} />
            <Route path="web/header-footer" element={<WebHeaderFooter />} />
            <Route path="web/styles"        element={<WebStyles />} />
            <Route path="web/assets"        element={<WebAssets />} />
            <Route path="web/editor/:slug" element={<WebIndex />} />

            {/* Other sub-apps (placeholders) */}
            <Route path="forms" element={<div className="p-8"><h1 className="text-2xl font-bold">Forms Builder</h1><p className="text-gray-500 mt-2">Coming soon.</p></div>} />
            <Route path="email" element={<div className="p-8"><h1 className="text-2xl font-bold">Email Sender</h1><p className="text-gray-500 mt-2">Coming soon.</p></div>} />

            {/* Admin */}
            <Route path="admin/users" element={<Users />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
