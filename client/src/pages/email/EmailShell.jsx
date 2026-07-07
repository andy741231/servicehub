import { Outlet } from 'react-router-dom';

// Sub-app section navigation now lives in the sidebar (drill-down children of
// the "Email Sender" parent). This shell is a pass-through for nested routes.
export default function EmailShell() {
  return <Outlet />;
}
