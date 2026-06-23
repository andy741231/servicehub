import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function SessionExpiredModal() {
  const { sessionExpired, clearSessionExpired, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionExpired) return;
    // Prevent accidental navigation while the modal is shown
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [sessionExpired]);

  if (!sessionExpired) return null;

  const handleLogin = async () => {
    try {
      await logout();
    } catch {
      // Token may already be expired; still clear local state and redirect.
    }
    clearSessionExpired();
    navigate('/hub-admin');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900">Session expired</h3>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                You have been logged out. Any unsaved changes will be lost. Please log in again to continue.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleLogin}
            autoFocus
            className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400"
          >
            Log in again
          </button>
        </div>
      </div>
    </div>
  );
}
