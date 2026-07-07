import { Outlet } from 'react-router-dom';

// Sub-app section navigation now lives in the sidebar (drill-down children of
// the "Directory" parent). This shell is a pass-through for nested routes.
export default function DirectoryShell() {
  return <Outlet />;
}
