import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import AuthLayout from './layouts/AuthLayout';
import AppShell from './layouts/AppShell';
import Login from './pages/auth/Login';
import Users from './pages/admin/Users';
import Settings from './pages/Settings';
import WebIndex from './pages/web/index';
import WebPages from './pages/web/Pages';
import WebStyles from './pages/web/Styles';
import WebAssets from './pages/web/Assets';
import WebHeaderFooter from './pages/web/HeaderFooter';
import WebDraftTemplates from './pages/web/DraftTemplates';
import WebPageTemplates from './pages/web/PageTemplates';
import WebShell from './pages/web/WebShell';
import FormsIndex from './pages/forms/index';
import FormsList from './pages/forms/FormsList';
import FormsBuilder from './pages/forms/FormsBuilder';
import Submissions from './pages/forms/Submissions';
import FormAnalytics from './pages/forms/FormAnalytics';
import FormTemplates from './pages/forms/FormTemplates';
import FormsShell from './pages/forms/FormsShell';
import EmailIndex from './pages/email/index';
import EmailShell from './pages/email/EmailShell';
import MailingLists from './pages/email/MailingLists';
import Directory from './pages/directory/index';
import DirectoryShell from './pages/directory/DirectoryShell';
import PortalShell from './pages/portal/PortalShell';
import PortalDashboard from './pages/portal/PortalDashboard';
import LoadingScreen from './components/LoadingScreen';
import Welcome from './pages/Welcome';
import SearchPage from './pages/Search';
import PublicHome from './pages/public/Home';
import FormView from './pages/public/FormView';
import WebDashboard from './pages/web/WebDashboard';
import EmailDashboard from './pages/email/EmailDashboard';
import TestEmail from './pages/email/TestEmail';
import EmailTemplates from './pages/email/EmailTemplates';
import EmailBuilder from './pages/email/builder/EmailBuilder';
import PaymentReconciliation from './pages/portal/PaymentReconciliation';
import DirectoryDashboard from './pages/directory/DirectoryDashboard';


function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/hub-admin" />;
  return children;
}

// Re-applies the theme on every route change: dark mode is an internal
// (admin) preference, so public routes are always forced light.
function ThemeRouteSync() {
  const location = useLocation();
  const syncThemeForPath = useThemeStore((s) => s.syncThemeForPath);
  useEffect(() => {
    syncThemeForPath(location.pathname);
  }, [location.pathname, syncThemeForPath]);
  return null;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Check auth on admin routes and the dedicated login page. Other public
    // routes (/, /form/:slug, /:slug) don't need a session.
    const path = window.location.pathname;
    if (path.startsWith('/hub-admin') || path === '/login') {
      checkAuth();
    }
  }, [checkAuth]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeRouteSync />
      <Routes>
        {/* ── Public site routes ── */}
        <Route path="/" element={<PublicHome />} />
        <Route path="/form/:formSlug" element={<FormView />} />
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route path="/:slug" element={<PublicHome />} />

        {/* ── Admin backend (/hub-admin/*) ── */}
        <Route path="/hub-admin">
          {/* Login at /hub-admin */}
          <Route element={<AuthLayout />}>
            <Route index element={<Login />} />
          </Route>

          {/* Protected sub-apps */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            {/* Welcome landing page (shown after login for multi-app users) */}
            <Route path="welcome" element={<Welcome />} />

            {/* Global search page */}
            <Route path="search" element={<SearchPage />} />

            {/* Web builder — nested under WebShell for tab nav */}
            <Route path="web" element={<WebShell />}>
              <Route index                  element={<Navigate to="/hub-admin/web/dashboard" replace />} />
              <Route path="dashboard"       element={<WebDashboard />} />
              <Route path="pages"           element={<WebPages />} />
              <Route path="header-footer"   element={<WebHeaderFooter />} />
              <Route path="styles"          element={<WebStyles />} />
              <Route path="assets"          element={<WebAssets />} />
              <Route path="templates"       element={<WebDraftTemplates />} />
              <Route path="page-templates"  element={<WebPageTemplates />} />
              <Route path="editor/:slug"    element={<WebIndex />} />
            </Route>

            {/* Forms — nested under FormsShell for tab nav */}
            <Route path="forms" element={<FormsShell />}>
              <Route index element={<Navigate to="/hub-admin/forms/dashboard" replace />} />
              <Route path="dashboard" element={<FormsIndex />} />
              <Route path="list" element={<FormsList />} />
              <Route path="builder/:formSlug?" element={<FormsBuilder />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="analytics/:formSlug?" element={<FormAnalytics />} />
              <Route path="templates" element={<FormTemplates />} />
            </Route>

            {/* Email — nested under EmailShell for tab nav */}
            <Route path="email" element={<EmailShell />}>
              <Route index element={<Navigate to="/hub-admin/email/dashboard" replace />} />
              <Route path="dashboard" element={<EmailDashboard />} />
              <Route path="campaigns/*" element={<EmailIndex />} />
              <Route path="builder" element={<EmailBuilder />} />
              <Route path="test" element={<TestEmail />} />
              <Route path="lists" element={<MailingLists />} />
              <Route path="templates" element={<EmailTemplates />} />
              <Route path="templates/new" element={<EmailBuilder />} />
              <Route path="templates/:id/edit" element={<EmailBuilder />} />
            </Route>

            {/* Directory — nested under DirectoryShell for tab nav */}
            <Route path="directory" element={<DirectoryShell />}>
              <Route index element={<Navigate to="/hub-admin/directory/dashboard" replace />} />
              <Route path="dashboard" element={<DirectoryDashboard />} />
              <Route path="browse" element={<Directory />} />
            </Route>

            {/* Portal — nested under PortalShell for tab nav */}
            <Route path="portal" element={<PortalShell />}>
              <Route index element={<Navigate to="/hub-admin/portal/dashboard" replace />} />
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="payment-reconciliation" element={<PaymentReconciliation />} />
            </Route>

            {/* Admin */}
            <Route path="admin/users" element={<Users />} />

            {/* Account settings (self-service, any authenticated user) */}
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
