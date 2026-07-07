import { useState } from 'react';
import { User, Mail, AtSign, Lock, Check, AlertCircle, Save } from 'lucide-react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

// Self-service account settings. Two independent sections:
//  - Profile: name, email, username (uniqueness enforced server-side)
//  - Password: requires the current password to verify before changing
// Each section submits separately so a profile save never blocks on the
// password fields (and vice versa).
export default function Settings() {
  const { user, setState } = useAuthStore();

  // ── Profile section ──
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password section ──
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [savingPw, setSavingPw] = useState(false);

  const onProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
    setProfileMsg({ type: '', text: '' });
  };

  const onPwChange = (e) => {
    const { name, value } = e.target;
    setPasswords((p) => ({ ...p, [name]: value }));
    setPwMsg({ type: '', text: '' });
  };

  const profileDirty =
    profile.name !== (user?.name ?? '') ||
    profile.email !== (user?.email ?? '') ||
    profile.username !== (user?.username ?? '');

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/profile', {
        name: profile.name,
        email: profile.email,
        username: profile.username,
      });
      // Update the global auth user so the topbar / sidebar reflect changes.
      setState({ user: res.data.user });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwords.newPassword && passwords.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setSavingPw(true);
    try {
      await api.put('/auth/profile', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setPwMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password.',
      });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display font-bold text-text-base tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">
            Manage your account profile and password.
          </p>
        </div>

        {/* ── Profile section ── */}
        <section className="bg-surface border border-border rounded-card shadow-card p-6 mb-6">
          <h2 className="text-heading font-semibold text-text-base mb-1">Profile</h2>
          <p className="text-sm text-muted mb-5">
            Update your display name, email, and username.
          </p>

          {profileMsg.text && (
            <div
              role="alert"
              aria-live="polite"
              className={`mb-5 p-3 rounded-base border flex items-center text-sm ${
                profileMsg.type === 'success'
                  ? 'bg-success-light border-success/20 text-success'
                  : 'bg-danger-light border-danger/20 text-danger'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <Check className="h-4 w-4 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              )}
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="field-label">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={profile.name}
                  onChange={onProfileChange}
                  className="input-field pl-9"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={onProfileChange}
                  className="input-field pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="field-label">Username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={profile.username}
                  onChange={onProfileChange}
                  className="input-field pl-9"
                  autoComplete="username"
                  required
                />
              </div>
              <p className="field-hint mt-1.5">Must be unique — no two users can share a username.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={!profileDirty || savingProfile}
              >
                <Save className="h-4 w-4" />
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Password section ── */}
        <section className="bg-surface border border-border rounded-card shadow-card p-6">
          <h2 className="text-heading font-semibold text-text-base mb-1">Password</h2>
          <p className="text-sm text-muted mb-5">
            Enter your current password to set a new one.
          </p>

          {pwMsg.text && (
            <div
              role="alert"
              aria-live="polite"
              className={`mb-5 p-3 rounded-base border flex items-center text-sm ${
                pwMsg.type === 'success'
                  ? 'bg-success-light border-success/20 text-success'
                  : 'bg-danger-light border-danger/20 text-danger'
              }`}
            >
              {pwMsg.type === 'success' ? (
                <Check className="h-4 w-4 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              )}
              {pwMsg.text}
            </div>
          )}

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="field-label">Current password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={onPwChange}
                  className="input-field pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="field-label">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={onPwChange}
                  className="input-field pl-9"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <p className="field-hint mt-1.5">At least 6 characters.</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="field-label">Confirm new password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={onPwChange}
                  className="input-field pl-9"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  savingPw ||
                  !passwords.currentPassword ||
                  !passwords.newPassword ||
                  !passwords.confirmPassword
                }
              >
                <Lock className="h-4 w-4" />
                {savingPw ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
