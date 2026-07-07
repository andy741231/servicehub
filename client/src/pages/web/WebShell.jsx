import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gauge, Files, PanelTop, Palette, Images, ExternalLink, FileStack } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

const TABS = [
  { label: 'Dashboard',      path: '/hub-admin/web/dashboard',      Icon: Gauge },
  { label: 'Pages',          path: '/hub-admin/web/pages',          Icon: Files     },
  { label: 'Header & Footer', path: '/hub-admin/web/header-footer',  Icon: PanelTop  },
  { label: 'Styles',         path: '/hub-admin/web/styles',         Icon: Palette   },
  { label: 'Assets',         path: '/hub-admin/web/assets',         Icon: Images    },
  { label: 'Draft Templates', path: '/hub-admin/web/templates',      Icon: FileStack },
];

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
  const { registerTabs, registerActions } = useTopBar();

  // Don't render the shell chrome for the editor route — clear tabs/actions
  // so the global TopBar shows only the shared user menu.
  const isEditor = location.pathname.includes('/web/editor/');
  const tabs = useMemo(() => (isEditor ? [] : TABS), [isEditor]);

  useEffect(() => {
    registerTabs(tabs);
    return () => registerTabs([]);
  }, [tabs, registerTabs]);

  useEffect(() => {
    registerActions(isEditor ? null : <ViewSiteAction />);
    return () => registerActions(null);
  }, [isEditor, registerActions]);

  return <Outlet />;
}
