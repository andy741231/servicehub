import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';

// ─── Focus trap hook ────────────────────────────────────────────────────────

function useFocusTrap(isActive) {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Focus the first focusable element
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    // Handle Tab key to trap focus
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Cleanup: restore focus when modal closes
    return () => {
      container.removeEventListener('keydown', handleTab);
      previousActiveElementRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

export default function SessionExpiredModal() {
  const { sessionExpired, clearSessionExpired } = useAuthStore();
  const navigate = useNavigate();
  const containerRef = useFocusTrap(sessionExpired);



  if (!sessionExpired) return null;

  const handleLogin = () => {
    // The session is already known to be expired; don't waste a round-trip to
    // the server logout endpoint (it would only 401 and delay the redirect).
    // Clear local auth state and redirect immediately.
    useAuthStore.getState().setState({
      user: null,
      isAuthenticated: false,
      sessionExpired: false,
      showLoggedOutMessage: false,
    });
    navigate('/hub-admin', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div ref={containerRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="session-expired-title" className="text-base font-semibold text-gray-900">Session expired</h3>
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
