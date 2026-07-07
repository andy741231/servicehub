import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Gauge, Mail, UserPlus, FileText } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

const TABS = [
  { label: 'Dashboard',     path: '/hub-admin/email/dashboard',   Icon: Gauge },
  { label: 'Campaigns',     path: '/hub-admin/email/campaigns',   Icon: Mail     },
  { label: 'Mailing Lists', path: '/hub-admin/email/lists',       Icon: UserPlus },
  { label: 'Templates',     path: '/hub-admin/email/templates',   Icon: FileText },
];

export default function EmailShell() {
  const { registerTabs } = useTopBar();
  const tabs = useMemo(() => TABS, []);

  useEffect(() => {
    registerTabs(tabs);
    return () => registerTabs([]);
  }, [tabs, registerTabs]);

  return <Outlet />;
}
