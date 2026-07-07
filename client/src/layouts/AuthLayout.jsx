import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-surface border border-border rounded-card shadow-modal p-8">
        <Outlet />
      </div>
    </div>
  );
}
