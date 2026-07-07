import { X } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoggedOutBanner() {
  const { showLoggedOutMessage, dismissLoggedOutMessage } = useAuthStore();

  if (!showLoggedOutMessage) return null;

  return (
    <div className="bg-warning-light border-b border-warning/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-warning">
            You have been logged out. <a href="/hub-admin" className="font-medium underline hover:text-warning">Log in again</a> to continue.
          </p>
        </div>
        <button
          onClick={dismissLoggedOutMessage}
          className="flex-shrink-0 text-warning hover:text-warning transition-colors"
          aria-label="Dismiss message"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}