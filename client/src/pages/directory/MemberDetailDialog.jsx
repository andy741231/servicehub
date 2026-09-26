import { useEffect, useState } from 'react';
import {
  Mail, Phone, MapPin, Calendar, HeartHandshake, Users, Shield,
  Clock, X, Pencil,
} from 'lucide-react';
import { AccessibleModal } from '../../components/Dialog';
import Skeleton from '../../components/Skeleton';
import { fetchMember, fetchMemberHistory, updateMember } from './api/directoryApi';
import useDirectoryStore from './store/directoryStore';
import {
  fullName, initials, spouseName, addressLine, statusLabel, statusChipCls,
  roleLabel, formatDate,
} from './utils/memberUtils';

const STAFF = ['helper', 'approver', 'admin'];

function Field({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-subtle flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="text-text-base break-words">{children}</div>
      </div>
    </div>
  );
}

export default function MemberDetailDialog({ memberId, onClose, onEdit }) {
  const { meta } = useDirectoryStore();
  const [member, setMember] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const isStaff = STAFF.includes(meta?.myRole);

  const markVerified = async () => {
    setVerifying(true);
    try {
      setMember(await updateMember(member.id, { lastVerifiedAt: new Date().toISOString() }));
    } catch { /* best effort */ }
    setVerifying(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchMember(memberId)
      .then((m) => { if (!cancelled) setMember(m); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || 'Failed to load member'); });
    return () => { cancelled = true; };
  }, [memberId]);

  useEffect(() => {
    if (!member || !isStaff) return;
    let cancelled = false;
    fetchMemberHistory(member.id)
      .then((logs) => { if (!cancelled) setHistory(logs); })
      .catch(() => { /* history is optional */ });
    return () => { cancelled = true; };
  }, [member, isStaff]);

  const spouse = member ? spouseName(member) : null;
  const address = member ? addressLine(member) : null;

  return (
    <AccessibleModal onClose={onClose} label="Member details" maxWidth="max-w-xl">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : !member ? (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton variant="line" className="!w-2/3" />
            <Skeleton variant="line" className="!w-1/2" />
            <Skeleton variant="line" className="!w-3/4" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={fullName(member)} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {initials(member)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-text-base">{fullName(member)}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(member.status)}`}>
                    {statusLabel(member.status)}
                  </span>
                  {member.role !== 'saint' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                      {roleLabel(member.role)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-0.5">
                  {member.district}
                  {member.smallGroup ? ` · ${member.smallGroup}` : ''}
                  {member.otherName ? ` · ${member.otherName}` : ''}
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-subtle hover:text-text-base rounded-lg hover:bg-surface-raised" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <Field icon={Mail} label="Email">
                {member.email
                  ? <a href={`mailto:${member.email}`} className="text-primary hover:underline">{member.email}</a>
                  : <span className="text-muted italic">Not provided</span>}
              </Field>
              <Field icon={Phone} label="Phone">
                {member.phone1 ? (
                  <span>
                    <a href={`tel:${member.phone1}`} className="text-primary hover:underline">{member.phone1}</a>
                    {member.phone2 ? ` · ${member.phone2}` : ''}
                  </span>
                ) : (
                  <span className="text-muted italic">{member.phoneVisible === false ? 'Hidden' : 'Not provided'}</span>
                )}
              </Field>
              <Field icon={MapPin} label="Address">
                {address || <span className="text-muted italic">{member.addressVisible === false ? 'Hidden' : 'Not provided'}</span>}
              </Field>
              <Field icon={Users} label="Locality">{member.locality}</Field>
              <Field icon={HeartHandshake} label="Spouse">{spouse}</Field>
              <Field icon={Calendar} label="Added">{formatDate(member.addedAt)}</Field>
              {member.dateOfBirth && (
                <Field icon={Calendar} label="Date of birth">{formatDate(member.dateOfBirth)}</Field>
              )}
              {member.isHeadOfHousehold && (
                <Field icon={Shield} label="Household">Head of household</Field>
              )}
            </div>

            {/* Staff-only metadata */}
            {isStaff && (
              <div className="mb-5 p-3 rounded-lg bg-surface-raised text-xs text-muted space-y-1">
                <div>Marital status: {member.maritalStatus ?? '—'} · Gender: {member.gender ?? '—'}</div>
                <div>
                  Privacy — phone: {member.phonePrivacy ? 'visible' : 'hidden'}, address: {member.addressPrivacy ? 'visible' : 'hidden'}
                  {' '}· Directory: {member.optedIn ? 'opted in' : 'opted out'}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {member.source === 'pdf-2024'
                      ? 'Imported from the 2024 phone list'
                      : member.source === 'manual' ? 'Added by staff' : ''}
                    {member.lastVerifiedAt
                      ? ` · verified ${formatDate(member.lastVerifiedAt)}`
                      : member.source === 'pdf-2024' ? ' · not yet verified' : ''}
                  </span>
                  {!member.lastVerifiedAt && member.source && (
                    <button
                      onClick={markVerified}
                      disabled={verifying}
                      className="shrink-0 px-2 py-1 rounded bg-primary-light text-primary text-[11px] font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                    >
                      {verifying ? 'Verifying…' : 'Mark verified'}
                    </button>
                  )}
                </div>
                {member.changedByName && (
                  <div>Last {member.changeType || 'change'} by {member.changedByName}{member.changedAt ? ` on ${formatDate(member.changedAt)}` : ''}</div>
                )}
              </div>
            )}

            {/* Audit history (staff only) */}
            {isStaff && history && history.length > 0 && (
              <div className="border-t border-border-soft pt-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-base mb-2">
                  <Clock className="h-4 w-4" /> History
                </div>
                <ul className="space-y-1.5 text-xs text-muted max-h-40 overflow-y-auto">
                  {history.map((log) => (
                    <li key={log.id} className="flex gap-2">
                      <span className="text-subtle whitespace-nowrap">{formatDate(log.createdAt)}</span>
                      <span>
                        <span className="font-medium text-text-base">{log.actorName}</span>
                        {' '}— {log.changeType}{log.summary ? ` (${log.summary})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {member && onEdit && isStaff && (
        <div className="flex justify-end gap-3 px-6 py-4 bg-surface-raised border-t border-border-soft">
          <button
            onClick={() => onEdit(member)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-base hover:bg-primary-hover min-h-[44px]"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        </div>
      )}
    </AccessibleModal>
  );
}
