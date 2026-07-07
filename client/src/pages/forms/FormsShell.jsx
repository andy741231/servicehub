import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Gauge, ClipboardList, Wrench, Inbox, BarChart3, Copy } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

const TABS = [
  { label: 'Dashboard',   path: '/hub-admin/forms/dashboard',   Icon: Gauge },
  { label: 'Forms',       path: '/hub-admin/forms/list',       Icon: ClipboardList  },
  { label: 'Builder',     path: '/hub-admin/forms/builder',     Icon: Wrench         },
  { label: 'Submissions', path: '/hub-admin/forms/submissions', Icon: Inbox          },
  { label: 'Analytics',   path: '/hub-admin/forms/analytics',   Icon: BarChart3      },
  { label: 'Templates',   path: '/hub-admin/forms/templates',   Icon: Copy           },
];

export default function FormsShell() {
  const { registerTabs } = useTopBar();
  const tabs = useMemo(() => TABS, []);

  useEffect(() => {
    registerTabs(tabs);
    return () => registerTabs([]);
  }, [tabs, registerTabs]);

  return <Outlet />;
}
