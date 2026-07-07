import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/hub-admin/welcome');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-text-base">Create your account</h2>
        <p className="text-sm text-muted mt-1">Sign up to start building with Service Hub.</p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" aria-live="polite" className="text-sm text-danger text-center bg-danger-light border border-danger/10 p-3 rounded-base">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-label text-muted mb-1.5">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                id="name"
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle min-h-[44px]"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-label text-muted mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                id="email"
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle min-h-[44px]"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-label text-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
              <input
                id="password"
                type="password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle min-h-[44px]"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-base text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary min-h-[44px]"
        >
          Register
        </button>

        <div className="text-sm text-center">
          <Link to="/hub-admin" className="font-medium text-primary hover:text-primary">
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
