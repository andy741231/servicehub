import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, IdCard, MapPin, KeyRound, Mail } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import api from '../../utils/api';
import { fetchMyProfile, updateMyProfile, updateHouseholdMember, uploadMemberPhoto } from './api/directoryApi';
import useDirectoryStore from './store/directoryStore';
import { fullName, initials, statusLabel, statusChipCls, roleLabel } from './utils/memberUtils';

const inputCls =
  'w-full px-3 py-2 text-sm border border-border rounded-base bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const labelCls = 'block text-xs font-medium text-muted mb-1';
const errCls = 'text-xs text-danger mt-1';

// All fields optional — imported phone-list rows often have only name/phone/
// district. The completeness nudge below encourages filling them in rather
// than blocking saves.
const profileSchema = z.object({
  email: z.string().email('Valid email required').or(z.literal('')),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phonePrivacy: z.boolean(),
  address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  addressPrivacy: z.boolean(),
  smallGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  otherName: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseFirstName: z.string().optional(),
  spouseLastName: z.string().optional(),
  optedIn: z.boolean(),
});

const toFormValues = (m) => ({
  email: m?.email ?? '',
  phone1: m?.phone1 ?? '',
  phone2: m?.phone2 ?? '',
  phonePrivacy: m?.phonePrivacy ?? true,
  address: m?.address ?? '',
  apartment: m?.apartment ?? '',
  city: m?.city ?? '',
  state: m?.state ?? '',
  zip: m?.zip ?? '',
  addressPrivacy: m?.addressPrivacy ?? false,
  smallGroup: m?.smallGroup ?? '',
  dateOfBirth: m?.dateOfBirth ? new Date(m.dateOfBirth).toISOString().slice(0, 10) : '',
  otherName: m?.otherName ?? '',
  maritalStatus: m?.maritalStatus ?? '',
  spouseFirstName: m?.spouseFirstName ?? '',
  spouseLastName: m?.spouseLastName ?? '',
  optedIn: m?.optedIn ?? true,
});

export default function MyProfile() {
  const { meta, loadMeta } = useDirectoryStore();
  const [member, setMember] = useState(null);
  const [household, setHousehold] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    fetchMyProfile()
      .then((data) => {
        setMember(data.member);
        setHousehold(data.household ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotLinked(true);
        else setSubmitError(err.response?.data?.error || 'Failed to load your record');
        setLoading(false);
      });
  }, []);

  const defaultValues = useMemo(() => toFormValues(member), [member]);
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  // Imported records often lack contact details — nudge rather than require.
  const missingFields = member
    ? [
        !member.email && 'email',
        !member.phone1 && 'phone',
        !member.address && 'address',
        !member.maritalStatus && 'marital status',
      ].filter(Boolean)
    : [];

  const onSubmit = async (values) => {
    setSubmitError(null);
    setSaved(false);
    try {
      const updated = await updateMyProfile(values);
      setMember(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    try {
      const updated = await uploadMemberPhoto(member.id, file);
      setMember(updated);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Photo upload failed');
    } finally {
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (notLinked) {
    return (
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        <EmptyState
          title="No directory record linked to your account"
          description="Ask a helper or approver in your district to add you to the phone list, or to link your login to an existing record."
          icon={IdCard}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="sr-only">My Profile</h1>
      {/* Header card — read-only identity fields */}
      <div className="mb-6 p-5 rounded-2xl bg-surface border border-border-soft shadow-card-sm flex items-center gap-4">
        <div className="relative">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold" aria-hidden="true">
              {initials(member)}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-primary transition-colors"
            aria-label="Change photo"
            title="Change photo"
          >
            <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhoto} aria-label="Upload photo" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-text-base">{fullName(member)}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(member.status)}`}>
              {statusLabel(member.status)}
            </span>
            {member.role !== 'saint' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                {roleLabel(member.role)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {member.district}
            {member.smallGroup ? ` · ${member.smallGroup}` : ''}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted mb-4">
        Your name, district, status, and role are maintained by your district's helpers and
        approvers — contact them to change those. Everything below is yours to keep up to date.
      </p>

      {missingFields.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-warning-light text-warning text-sm" role="note">
          Your record is missing {missingFields.join(', ')} — please fill it in so the saints can reach you.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 rounded-2xl bg-surface border border-border-soft shadow-card-sm space-y-4">
          <div aria-live="polite">
            {submitError && <div role="alert" className="p-3 rounded-lg bg-danger-light text-danger text-sm">{submitError}</div>}
            {saved && <div className="p-3 rounded-lg bg-success-light text-success text-sm">Saved — your info is up to date.</div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Email</span>
              <input type="email" {...register('email')} className={inputCls} inputMode="email" />
              {errors.email && <span className={errCls} role="alert">{errors.email.message}</span>}
            </label>
            <label className="block">
              <span className={labelCls}>Other name (maiden / non-English)</span>
              <input {...register('otherName')} className={inputCls} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Phone 1</span>
              <input {...register('phone1')} className={inputCls} inputMode="tel" />
            </label>
            <label className="block">
              <span className={labelCls}>Phone 2</span>
              <input {...register('phone2')} className={inputCls} inputMode="tel" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-base cursor-pointer -mt-1">
            <input type="checkbox" {...register('phonePrivacy')} />
            Show my phone number to other saints
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Street address</span>
              <input {...register('address')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Apt #</span>
              <input {...register('apartment')} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block col-span-2">
              <span className={labelCls}>City</span>
              <input {...register('city')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>State</span>
              <input {...register('state')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>ZIP</span>
              <input {...register('zip')} className={inputCls} inputMode="numeric" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-base cursor-pointer -mt-1">
            <input type="checkbox" {...register('addressPrivacy')} />
            Show my address to other saints
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls}>Marital status</span>
              <select {...register('maritalStatus')} className={inputCls}>
                <option value="">—</option>
                {(meta?.maritalStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Date of birth</span>
              <input type="date" {...register('dateOfBirth')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Small group</span>
              <input {...register('smallGroup')} className={inputCls} />
            </label>
          </div>

          {!member.spouseMemberId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className={labelCls}>Spouse first name</span>
                <input {...register('spouseFirstName')} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Spouse last name</span>
                <input {...register('spouseLastName')} className={inputCls} />
              </label>
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-text-base cursor-pointer">
            <input type="checkbox" {...register('optedIn')} className="mt-0.5" />
            <span>
              List me in the directory
              <span className="block text-xs text-muted">Uncheck to hide yourself from other saints (helpers/approvers can still see you)</span>
            </span>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-base hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {household.length > 0 && (
        <HouseholdCard
          spouse={household[0]}
          onSaved={(updated) => setHousehold([updated])}
        />
      )}

      <SignInCard email={member.email} />
    </div>
  );
}

// Lets saints set a password (magic-link accounts start passwordless) so both
// sign-in methods from the directory login page work. Only renders for an
// actual directory session — Hub users manage their own Hub password.
function SignInCard({ email }) {
  const session = useDirectoryStore((s) => s.session);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  if (!session?.account) return null;

  const handleSet = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (pw.length < 8) return setErr('Password must be at least 8 characters');
    if (pw !== pw2) return setErr('Passwords do not match');
    setBusy(true);
    try {
      const res = await api.post('/directory/auth/password', { newPassword: pw });
      setMsg(res.data.message || 'Password set');
      setPw('');
      setPw2('');
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to set password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 p-6 rounded-2xl bg-surface border border-border-soft shadow-card-sm">
      <h3 className="text-sm font-semibold text-text-base mb-1 flex items-center gap-2">
        <KeyRound className="h-4 w-4" aria-hidden="true" /> Sign-in options
      </h3>
      <p className="text-xs text-muted mb-4 flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        You can request a sign-in link using {email || 'your email on file'}. You may also set a password below.
      </p>
      <div aria-live="polite">
        {msg && <div className="mb-3 p-3 rounded-lg bg-success-light text-success text-sm">{msg}</div>}
        {err && <div role="alert" className="mb-3 p-3 rounded-lg bg-danger-light text-danger text-sm">{err}</div>}
      </div>
      <form onSubmit={handleSet} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <label className="block">
          <span className={labelCls}>New password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} autoComplete="new-password" />
        </label>
        <label className="block">
          <span className={labelCls}>Confirm password</span>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} autoComplete="new-password" />
        </label>
        <button
          type="submit"
          disabled={busy || !pw}
          className="px-4 py-2 text-sm font-medium bg-surface-tertiary text-text-base rounded-base hover:bg-surface-raised disabled:opacity-50 min-h-[44px]"
        >
          {busy ? 'Setting…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}

// Household section — the linked spouse's self-editable fields (§6.3.4).
// Email is intentionally absent (it's the spouse's sign-in identity); so is
// optedIn (their personal listing consent). Status/role/district stay
// staff-maintained and are shown read-only in the header.
const householdSchema = z.object({
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phonePrivacy: z.boolean(),
  address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  addressPrivacy: z.boolean(),
  smallGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  otherName: z.string().optional(),
  maritalStatus: z.string().optional(),
  spouseFirstName: z.string().optional(),
  spouseLastName: z.string().optional(),
});

const toHouseholdValues = (m) => ({
  phone1: m?.phone1 ?? '',
  phone2: m?.phone2 ?? '',
  phonePrivacy: m?.phonePrivacy ?? true,
  address: m?.address ?? '',
  apartment: m?.apartment ?? '',
  city: m?.city ?? '',
  state: m?.state ?? '',
  zip: m?.zip ?? '',
  addressPrivacy: m?.addressPrivacy ?? false,
  smallGroup: m?.smallGroup ?? '',
  dateOfBirth: m?.dateOfBirth ? new Date(m.dateOfBirth).toISOString().slice(0, 10) : '',
  otherName: m?.otherName ?? '',
  maritalStatus: m?.maritalStatus ?? '',
  spouseFirstName: m?.spouseFirstName ?? '',
  spouseLastName: m?.spouseLastName ?? '',
});

function HouseholdCard({ spouse, onSaved }) {
  const { meta, loadMeta } = useDirectoryStore();
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const defaultValues = useMemo(() => toHouseholdValues(spouse), [spouse]);
  const {
    register, handleSubmit, reset,
    formState: { isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(householdSchema), defaultValues });
  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const onSubmit = async (values) => {
    setSubmitError(null);
    setSaved(false);
    try {
      const updated = await updateHouseholdMember(spouse.id, values);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text-base mb-1">Household</h3>
      <p className="text-xs text-muted mb-3">
        Keep your spouse's record up to date too — their name, district, status,
        and sign-in email are maintained by helpers and approvers.
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 rounded-2xl bg-surface border border-border-soft shadow-card-sm space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-semibold text-text-base">{fullName(spouse)}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(spouse.status)}`}>
              {statusLabel(spouse.status)}
            </span>
            <span className="text-xs text-muted flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" /> {spouse.district}
            </span>
          </div>

          <div aria-live="polite">
            {submitError && <div role="alert" className="p-3 rounded-lg bg-danger-light text-danger text-sm">{submitError}</div>}
            {saved && <div className="p-3 rounded-lg bg-success-light text-success text-sm">Saved — your spouse's info is up to date.</div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Phone 1</span>
              <input {...register('phone1')} className={inputCls} inputMode="tel" />
            </label>
            <label className="block">
              <span className={labelCls}>Phone 2</span>
              <input {...register('phone2')} className={inputCls} inputMode="tel" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-base cursor-pointer -mt-1">
            <input type="checkbox" {...register('phonePrivacy')} />
            Show their phone number to other saints
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Street address</span>
              <input {...register('address')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Apt #</span>
              <input {...register('apartment')} className={inputCls} />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="block col-span-2">
              <span className={labelCls}>City</span>
              <input {...register('city')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>State</span>
              <input {...register('state')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>ZIP</span>
              <input {...register('zip')} className={inputCls} inputMode="numeric" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-base cursor-pointer -mt-1">
            <input type="checkbox" {...register('addressPrivacy')} />
            Show their address to other saints
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls}>Marital status</span>
              <select {...register('maritalStatus')} className={inputCls}>
                <option value="">—</option>
                {(meta?.maritalStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Date of birth</span>
              <input type="date" {...register('dateOfBirth')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Small group</span>
              <input {...register('smallGroup')} className={inputCls} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Other name (maiden / non-English)</span>
              <input {...register('otherName')} className={inputCls} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Spouse first name</span>
              <input {...register('spouseFirstName')} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>Spouse last name</span>
              <input {...register('spouseLastName')} className={inputCls} />
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-base hover:bg-primary-hover disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting ? 'Saving…' : 'Save spouse changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
