import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

const TABS = [
  { label: 'Dashboard', path: '/hub-admin/portal/dashboard', Icon: Gauge },
];

export default function PortalShell() {
  const { registerTabs } = useTopBar();
  const tabs = useMemo(() => TABS, []);

  useEffect(() => {
    registerTabs(tabs);
    return () => registerTabs([]);
  }, [tabs, registerTabs]);

  return <Outlet />;
}
