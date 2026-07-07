import { Outlet } from 'react-router-dom';

// Sub-app section navigation now lives in the sidebar (drill-down children of
// the "Form Builder" parent). This shell is a pass-through for nested routes.
export default function FormsShell() {
  return <Outlet />;
}
