import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AuthLayout from './layouts/AuthLayout';
import AppShell from './layouts/AppShell';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Users from './pages/admin/Users';
import WebIndex from './pages/web/index';

import PublicHome from './pages/public/Home';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/web/login" />;
  
  return children;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicHome />} />

        {/* Admin Backend Routes */}
        <Route path="/web">
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          {/* Protected App Routes */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<WebIndex />} />
            <Route path="forms" element={<div className="p-4 bg-white rounded shadow"><h1>Forms Builder Placeholder</h1></div>} />
            <Route path="email" element={<div className="p-4 bg-white rounded shadow"><h1>Email Sender Placeholder</h1></div>} />
            
            {/* Admin Routes */}
            <Route path="admin/users" element={<Users />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
