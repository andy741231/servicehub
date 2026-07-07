import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Gauge, BookOpen } from 'lucide-react';
import { useTopBar } from '../../components/TopBar';

const TABS = [
  { label: 'Dashboard', path: '/hub-admin/directory/dashboard', Icon: Gauge },
  { label: 'Browse',    path: '/hub-admin/directory/browse',    Icon: BookOpen },
];

export default function DirectoryShell() {
  const { registerTabs } = useTopBar();
  const tabs = useMemo(() => TABS, []);

  useEffect(() => {
    registerTabs(tabs);
    return () => registerTabs([]);
  }, [tabs, registerTabs]);

  return <Outlet />;
}
