import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

// "View site" action rendered into the TopBar's right slot (sub-app section).
function ViewSiteAction() {
  return (
    <a
      href="/"
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary transition-colors px-3 py-1.5 rounded-base hover:bg-primary-light min-h-[44px]"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      View site
    </a>
  );
}

export default function WebShell() {
  const location = useLocation();
  const { registerActions, registerTitle } = useTopBar();

  // Don't render the shell chrome for the editor route — clear actions
  // so the global TopBar shows only the shared user menu.
  const isEditor = location.pathname.includes('/web/editor/');

  useEffect(() => {
    registerActions(isEditor ? null : <ViewSiteAction />);
    return () => registerActions(null);
  }, [isEditor, registerActions]);

  useEffect(() => {
    registerTitle('Website');
    return () => registerTitle('');
  }, [registerTitle]);

  return <Outlet />;
}
