import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from 'use-debounce';
import { Search, X, AlertTriangle, ChevronRight } from 'lucide-react';
import { AccessibleModal } from '../../components/Dialog';
import Skeleton from '../../components/Skeleton';
import { checkDuplicates, createMember, updateMember, fetchMembers } from './api/directoryApi';
import useDirectoryStore from './store/directoryStore';
import { fullName, statusLabel, statusChipCls } from './utils/memberUtils';

const inputCls =
  'w-full px-3 py-2 text-sm border border-border rounded-base bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const labelCls = 'block text-xs font-medium text-muted mb-1';
const errCls = 'text-xs text-danger mt-1';

const memberSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Required'),
  otherName: z.string().optional(),
  // Optional in the data — imported phone-list rows often have no email/address.
  email: z.string().email('Valid email required').or(z.literal('')),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  dateOfBirth: z.string().optional(),
  district: z.string().min(1, 'Required'),
  smallGroup: z.string().optional(),
  locality: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phonePrivacy: z.boolean(),
  address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  addressPrivacy: z.boolean(),
  optedIn: z.boolean(),
  isHeadOfHousehold: z.boolean(),
  spouseMemberId: z.string().nullable().optional(),
  spouseFirstName: z.string().optional(),
  spouseLastName: z.string().optional(),
});

const toFormValues = (m) => ({
  firstName: m?.firstName ?? '',
  middleName: m?.middleName ?? '',
  lastName: m?.lastName ?? '',
  otherName: m?.otherName ?? '',
  email: m?.email ?? '',
  gender: m?.gender ?? '',
  maritalStatus: m?.maritalStatus ?? '',
  dateOfBirth: m?.dateOfBirth ? new Date(m.dateOfBirth).toISOString().slice(0, 10) : '',
  district: m?.district ?? '',
  smallGroup: m?.smallGroup ?? '',
  locality: m?.locality ?? 'Houston',
  phone1: m?.phone1 ?? '',
  phone2: m?.phone2 ?? '',
  phonePrivacy: m?.phonePrivacy ?? true,
  address: m?.address ?? '',
  apartment: m?.apartment ?? '',
  city: m?.city ?? '',
  state: m?.state ?? 'TX',
  zip: m?.zip ?? '',
  addressPrivacy: m?.addressPrivacy ?? false,
  optedIn: m?.optedIn ?? true,
  isHeadOfHousehold: m?.isHeadOfHousehold ?? false,
  spouseMemberId: m?.spouseMemberId ?? null,
  spouseFirstName: m?.spouseFirstName ?? '',
  spouseLastName: m?.spouseLastName ?? '',
});

const toPayload = (v) => ({
  ...v,
  middleName: v.middleName || null,
  otherName: v.otherName || null,
  dateOfBirth: v.dateOfBirth || null,
  smallGroup: v.smallGroup || null,
  locality: v.locality || 'Houston',
  phone2: v.phone2 || null,
  apartment: v.apartment || null,
  spouseMemberId: v.spouseMemberId || null,
  spouseFirstName: v.spouseFirstName || null,
  spouseLastName: v.spouseLastName || null,
});

// ── Step 1 (add mode only): duplicate check ────────────────────────────────
function DuplicateCheck({ onProceed, onCancel }) {
  const [input, setInput] = useState('');
  const [q] = useDebounce(input, 350);
  const [matches, setMatches] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);

  useEffect(() => {
    if (!q || q.trim().length < 2) { setMatches(null); setCheckError(null); return; }
    let cancelled = false;
    setChecking(true);
    setCheckError(null);
    checkDuplicates(q.trim())
      .then((m) => { if (!cancelled) setMatches(m); })
      // A failed check is NOT "safe to add" — surface it honestly.
      .catch((err) => { if (!cancelled) { setMatches(null); setCheckError(err.response?.data?.error || 'Search failed — try again'); } })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [q]);

  // Require a completed search before continuing — that's the whole point of
  // this step per the spec.
  const searched = !checking && !checkError && matches !== null;
  const hasExact = (matches ?? []).some((m) => m.exactPhone || m.exactName);

  return (
    <div className="p-6">
      <h3 className="text-base font-semibold text-text-base mb-1">Check for an existing record</h3>
      <p className="text-sm text-muted mb-4">
        Before adding, search the whole church list (all districts, any status) so the same
        person isn't added twice.
      </p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" aria-hidden="true" />
        <input
          autoFocus
          type="text"
          aria-label="Search for an existing record by name, email, or phone"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Name, email, or phone…"
          className={`${inputCls} pl-9 min-h-[44px]`}
        />
      </div>

      {checking && <Skeleton className="h-20 rounded-lg" />}
      {checkError && <p role="alert" className="text-sm text-danger mb-4">{checkError}</p>}
      {!checking && matches && (
        matches.length === 0 ? (
          <p className="text-sm text-success mb-4">No matches found — safe to add.</p>
        ) : (
          <div className="mb-4 max-h-56 overflow-y-auto space-y-2">
            <p className="text-xs font-medium text-warning flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {hasExact ? 'Likely the same person — confirm this is really someone new:' : 'Possible existing records:'}
            </p>
            {matches.map((m) => (
              <div key={m.id} className="p-2.5 rounded-lg border border-border bg-surface-raised text-sm flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-text-base">{fullName(m)}</span>
                  <span className="text-muted"> · {m.district} · {m.email || m.phone1 || 'no contact info'}</span>
                  {(m.exactPhone || m.exactName) && (
                    <span className="text-warning font-medium"> — {m.exactPhone ? 'same phone' : 'same name'}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusChipCls(m.status)}`}>
                  {statusLabel(m.status)}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 min-h-[44px] text-sm font-medium text-text-base bg-surface border border-border rounded-lg hover:bg-surface-raised">
          Cancel
        </button>
        <button
          onClick={onProceed}
          disabled={!searched}
          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          Continue to add <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Spouse picker: search members and link ─────────────────────────────────
function SpousePicker({ value, displayName, onChange }) {
  const [input, setInput] = useState('');
  const [q] = useDebounce(input, 300);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (!q || q.trim().length < 2) { setOptions([]); return; }
    let cancelled = false;
    fetchMembers({ q: q.trim(), pageSize: 10 })
      .then((d) => { if (!cancelled) setOptions(d.members); })
      .catch(() => { if (!cancelled) setOptions([]); });
    return () => { cancelled = true; };
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-base border border-border bg-surface-raised text-sm">
        <span className="text-text-base truncate">{displayName || 'Linked member'}</span>
        <button type="button" onClick={() => onChange(null, null)} className="p-1 text-subtle hover:text-danger" aria-label="Remove spouse link">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        aria-label="Search members to link as spouse"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search members to link spouse…"
        className={inputCls}
      />
      {options.length > 0 && (
        <div role="listbox" className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-border bg-surface shadow-modal max-h-44 overflow-y-auto">
          {options.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              onClick={() => { onChange(m.id, fullName(m)); setInput(''); setOptions([]); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface-raised flex justify-between gap-2"
            >
              <span className="text-text-base truncate">{fullName(m)}</span>
              <span className="text-muted text-xs flex-shrink-0">{m.district}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dialog ────────────────────────────────────────────────────────────
export default function MemberFormDialog({ member, onClose, onSaved }) {
  const { meta } = useDirectoryStore();
  const isEdit = Boolean(member?.id);
  const [step, setStep] = useState(isEdit ? 'form' : 'check');
  const [submitError, setSubmitError] = useState(null);
  const [spouseLabel, setSpouseLabel] = useState(member?.spouse ? fullName(member.spouse) : null);

  const isAdmin = meta?.myRole === 'admin';
  const canSetDistrict = isAdmin || meta?.myRole === 'approver';

  const defaultValues = useMemo(
    () => toFormValues(member ? member : { district: meta?.myDistrict ?? '' }),
    [member, meta],
  );

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(memberSchema), defaultValues });

  const spouseMemberId = watch('spouseMemberId');

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const payload = toPayload(values);
      const saved = isEdit
        ? await updateMember(member.id, payload)
        : await createMember(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save member');
    }
  };

  return (
    <AccessibleModal onClose={onClose} label={isEdit ? 'Edit member' : 'Add member'} maxWidth="max-w-2xl">
      {!isEdit && step === 'check' ? (
        <DuplicateCheck onProceed={() => setStep('form')} onCancel={onClose} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-base">
                {isEdit ? `Edit ${fullName(member)}` : 'Add member'}
              </h3>
              <button type="button" onClick={onClose} className="p-2 text-subtle hover:text-text-base rounded-lg hover:bg-surface-raised" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div role="alert" className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{submitError}</div>
            )}

            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <label className="block">
                <span className={labelCls}>First name *</span>
                <input {...register('firstName')} className={inputCls} />
                {errors.firstName && <span className={errCls} role="alert">{errors.firstName.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Middle</span>
                <input {...register('middleName')} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Last name *</span>
                <input {...register('lastName')} className={inputCls} />
                {errors.lastName && <span className={errCls} role="alert">{errors.lastName.message}</span>}
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className={labelCls}>Other name (maiden / non-English)</span>
                <input {...register('otherName')} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Email</span>
                <input type="email" {...register('email')} className={inputCls} inputMode="email" />
                {errors.email && <span className={errCls} role="alert">{errors.email.message}</span>}
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <label className="block">
                <span className={labelCls}>Gender</span>
                <select {...register('gender')} className={inputCls}>
                  <option value="">—</option>
                  {(meta?.genders ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.gender && <span className={errCls} role="alert">{errors.gender.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Marital status</span>
                <select {...register('maritalStatus')} className={inputCls}>
                  <option value="">—</option>
                  {(meta?.maritalStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.maritalStatus && <span className={errCls} role="alert">{errors.maritalStatus.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Date of birth</span>
                <input type="date" {...register('dateOfBirth')} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Locality</span>
                <input {...register('locality')} className={inputCls} />
              </label>
            </div>

            {/* Directory assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className={labelCls}>District *</span>
                <select {...register('district')} className={inputCls} disabled={!canSetDistrict}>
                  <option value="">—</option>
                  {(meta?.districts ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {!canSetDistrict && <span className="block text-xs text-muted mt-1">Only approvers/admins can change district</span>}
                {errors.district && <span className={errCls} role="alert">{errors.district.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Small group</span>
                <input {...register('smallGroup')} className={inputCls} />
              </label>
            </div>

            {/* Phones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className={labelCls}>Phone 1</span>
                <input {...register('phone1')} className={inputCls} inputMode="tel" />
                {errors.phone1 && <span className={errCls} role="alert">{errors.phone1.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Phone 2</span>
                <input {...register('phone2')} className={inputCls} inputMode="tel" />
              </label>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Street address</span>
                <input {...register('address')} className={inputCls} />
                {errors.address && <span className={errCls} role="alert">{errors.address.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>Apt #</span>
                <input {...register('apartment')} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <label className="block col-span-2">
                <span className={labelCls}>City</span>
                <input {...register('city')} className={inputCls} />
                {errors.city && <span className={errCls} role="alert">{errors.city.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>State</span>
                <input {...register('state')} className={inputCls} />
                {errors.state && <span className={errCls} role="alert">{errors.state.message}</span>}
              </label>
              <label className="block">
                <span className={labelCls}>ZIP</span>
                <input {...register('zip')} className={inputCls} inputMode="numeric" />
                {errors.zip && <span className={errCls} role="alert">{errors.zip.message}</span>}
              </label>
            </div>

            {/* Household */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <span className={labelCls} id="spouse-picker-label">Spouse (linked member)</span>
                <SpousePicker
                  value={spouseMemberId}
                  displayName={spouseLabel}
                  onChange={(id, name) => { setValue('spouseMemberId', id); setSpouseLabel(name); }}
                />
              </div>
              {!spouseMemberId && (
                <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-start gap-2 text-sm text-text-base cursor-pointer">
                <input type="checkbox" {...register('phonePrivacy')} className="mt-0.5" />
                <span>Phone visible<span className="block text-xs text-muted">to other saints</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm text-text-base cursor-pointer">
                <input type="checkbox" {...register('addressPrivacy')} className="mt-0.5" />
                <span>Address visible<span className="block text-xs text-muted">to other saints</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm text-text-base cursor-pointer">
                <input type="checkbox" {...register('optedIn')} className="mt-0.5" />
                <span>Listed<span className="block text-xs text-muted">in the directory</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm text-text-base cursor-pointer">
                <input type="checkbox" {...register('isHeadOfHousehold')} className="mt-0.5" />
                <span>Head of<span className="block text-xs text-muted">household</span></span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 bg-surface-raised border-t border-border-soft">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-base bg-surface border border-border rounded-lg hover:bg-surface-raised">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 min-h-[40px]"
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </form>
      )}
    </AccessibleModal>
  );
}
