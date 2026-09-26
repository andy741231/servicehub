import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import api from '../../utils/api';
import useDirectoryStore from './store/directoryStore';
import LoadingScreen from '../../components/LoadingScreen';

// Consumes /directory/verify?token=… from magic-link emails.
export default function DirectoryVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useDirectoryStore((s) => s.setSession);
  const [error, setError] = useState(null);
  const ran = useRef(false); // guard against StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = searchParams.get('token');
    if (!token) {
      setError('This sign-in link is missing its token. Request a new one.');
      return;
    }
    api.post('/directory/auth/verify', { token })
      .then((res) => setSession(res.data))
      .then(() => navigate('/directory', { replace: true }))
      .catch((err) => setError(err.response?.data?.error || 'That sign-in link is invalid or has expired.'));
  }, [searchParams, setSession, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="bg-surface border border-border rounded-2xl shadow-card-sm p-6">
            <h1 className="text-base font-semibold text-text-base mb-2">Couldn't sign you in</h1>
            <p className="text-sm text-muted mb-4">{error}</p>
            <Link
              to="/directory/login"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover text-sm font-medium min-h-[44px]"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <LoadingScreen />;
}
