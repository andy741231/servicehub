import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AuthLayout from './layouts/AuthLayout';
import AppShell from './layouts/AppShell';
import Login from './pages/auth/Login';
import Users from './pages/admin/Users';
import WebIndex from './pages/web/index';
import WebPages from './pages/web/Pages';
import WebStyles from './pages/web/Styles';
import WebAssets from './pages/web/Assets';
import WebHeaderFooter from './pages/web/HeaderFooter';
import WebDraftTemplates from './pages/web/DraftTemplates';
import WebShell from './pages/web/WebShell';
import FormsIndex from './pages/forms/index';
import FormsBuilder from './pages/forms/FormsBuilder';
import Submissions from './pages/forms/Submissions';
import FormAnalytics from './pages/forms/FormAnalytics';
import EmailIndex from './pages/email/index';
import EmailShell from './pages/email/EmailShell';
import NewsletterBuilder from './pages/email/NewsletterBuilder';
import Directory from './pages/directory/index';
import PublicHome from './pages/public/Home';
import FormView from './pages/public/FormView';
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
        <Route path="/form/:formId" element={<FormView />} />
        <Route path="/:slug" element={<PublicHome />} />

        {/* ── Admin backend (/hub-admin/*) ── */}
        <Route path="/hub-admin">
          {/* Login at /hub-admin */}
          <Route element={<AuthLayout />}>
            <Route index element={<Login />} />
          </Route>

          {/* Protected sub-apps */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            {/* Web builder — nested under WebShell for tab nav */}
            <Route path="web" element={<WebShell />}>
              <Route index                  element={<WebPages />} />
              <Route path="pages"           element={<WebPages />} />
              <Route path="header-footer"   element={<WebHeaderFooter />} />
              <Route path="styles"          element={<WebStyles />} />
              <Route path="assets"          element={<WebAssets />} />
              <Route path="templates"       element={<WebDraftTemplates />} />
              <Route path="editor/:slug"    element={<WebIndex />} />
            </Route>

            {/* Other sub-apps */}
            <Route path="forms" element={<FormsIndex />} />
            <Route path="forms/builder/:formId?" element={<FormsBuilder />} />
            <Route path="forms/submissions" element={<Submissions />} />
            <Route path="forms/analytics/:formId?" element={<FormAnalytics />} />
            <Route path="email" element={<EmailShell />}>
              <Route index element={<EmailIndex />} />
              <Route path="campaigns/new" element={<NewsletterBuilder />} />
              <Route path="lists" element={<div className="p-8"><h1 className="text-2xl font-bold">Mailing Lists</h1><p className="text-gray-500 mt-2">Coming soon.</p></div>} />
              <Route path="templates" element={<div className="p-8"><h1 className="text-2xl font-bold">Email Templates</h1><p className="text-gray-500 mt-2">Coming soon.</p></div>} />
            </Route>
            <Route path="directory" element={<Directory />} />
            <Route path="portal" element={<div className="p-8"><h1 className="text-2xl font-bold">Portal</h1><p className="text-gray-500 mt-2">Coming soon.</p></div>} />

            {/* Admin */}
            <Route path="admin/users" element={<Users />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
