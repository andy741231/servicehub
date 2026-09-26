import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BookOpen, Mail, KeyRound, MailCheck } from 'lucide-react';
import api from '../../utils/api';
import useDirectoryStore from './store/directoryStore';

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-border rounded-base bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

// Saint-facing sign-in: magic link (primary) or email + password.
// Lives outside /hub-admin — saints never see the admin shell.
export default function DirectoryLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useDirectoryStore((s) => s.setSession);

  const [mode, setMode] = useState('magic'); // 'magic' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [error, setError] = useState(searchParams.get('error') || null);
  const [helpers, setHelpers] = useState([]);

  // Public list of helpers/approvers — so a visitor knows who to ask in person.
  useEffect(() => {
    api.get('/directory/auth/helpers')
      .then((res) => setHelpers(res.data.helpers))
      .catch(() => setHelpers([]));
  }, []);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/directory/auth/request-link', { email });
      setSentTo({ email: email.trim(), message: res.data.message });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the sign-in link. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/directory/auth/login', { email, password, rememberMe });
      setSession(res.data);
      navigate('/directory', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-text-base">The Church in Houston Directory</h1>
          <p className="text-sm text-muted mt-1">Find contact information for fellowship and keep your profile up to date.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-card-sm p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
          )}

          {sentTo ? (
            <div className="text-center py-4">
              <MailCheck className="h-10 w-10 text-success mx-auto mb-3" />
              <h2 className="text-base font-semibold text-text-base mb-1">Check your email</h2>
              <p className="text-sm text-muted">
                {sentTo.message || 'A sign-in link is on its way. It works once and expires in 30 minutes.'}
              </p>
              <p className="text-xs text-subtle mt-1">If you don't see it in a few minutes, check Junk or Spam.</p>
              <button
                onClick={() => { setSentTo(null); setEmail(''); }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : mode === 'magic' ? (
            <form onSubmit={handleMagicLink}>
              <label className="block text-xs font-medium text-muted mb-1" htmlFor="dir-email">Your email in the directory</label>
              <input
                id="dir-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${inputCls} mb-4`}
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                <Mail className="h-4 w-4" />
                {busy ? 'Sending…' : 'Send me a sign-in link'}
              </button>
              <p className="text-xs text-muted text-center mt-3">No password needed — we email you a one-time link.</p>

              <div className="mt-5 pt-4 border-t border-border-soft text-center">
                <button
                  type="button"
                  onClick={() => { setMode('password'); setError(null); }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
                >
                  <KeyRound className="h-4 w-4" /> Sign in with a password instead
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin}>
              <label className="block text-xs font-medium text-muted mb-1" htmlFor="dir-pw-email">Email</label>
              <input
                id="dir-pw-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${inputCls} mb-3`}
              />
              <label className="block text-xs font-medium text-muted mb-1" htmlFor="dir-pw">Password</label>
              <input
                id="dir-pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} mb-3`}
              />
              <label className="flex items-center gap-2 text-sm text-muted mb-4 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Stay signed in
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                <KeyRound className="h-4 w-4" />
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <div className="mt-5 pt-4 border-t border-border-soft text-center space-y-2">
                <button
                  type="button"
                  onClick={() => { setMode('magic'); setError(null); }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
                >
                  <Mail className="h-4 w-4" /> Email me a sign-in link instead
                </button>
                <p className="text-xs text-muted">Forgot your password? Use the email link — you can set a new one from My Profile.</p>
              </div>
            </form>
          )}
        </div>

        <div className="text-xs text-muted text-center mt-4 space-y-1.5">
          {helpers.length > 0 ? (
            <p>
              Need help signing in or joining the directory? Contact a helper:{' '}
              {helpers.map((h, i) => (
                <span key={`${h.firstName}-${h.lastName}-${i}`}>
                  <span className="font-medium text-text-base">{h.firstName} {h.lastName}</span>
                  <span className="text-subtle"> ({h.district}{h.role === 'approver' ? ' · approver' : ''})</span>
                  {i < helpers.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          ) : (
            <p>Need help signing in or joining the directory? Contact the serving brothers.</p>
          )}
          <p><Link to="/hub-admin" className="hover:text-primary">Service Hub admin sign-in</Link></p>
        </div>
      </div>
    </div>
  );
}
