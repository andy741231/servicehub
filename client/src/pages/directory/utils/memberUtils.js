// Shared display helpers for directory members.

export const fullName = (m) => [m?.firstName, m?.middleName, m?.lastName].filter(Boolean).join(' ');

export const initials = (m) =>
  `${m?.firstName?.[0] ?? ''}${m?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

export const spouseName = (m) => {
  if (m?.spouse) return fullName(m.spouse);
  return [m?.spouseFirstName, m?.spouseLastName].filter(Boolean).join(' ') || null;
};

export const addressLine = (m) => {
  if (!m?.address && !m?.city) return null;
  return [m.address, m.apartment, m.city, m.state, m.zip].filter(Boolean).join(', ');
};

export const STATUS_STYLES = {
  active:    { label: 'Active',      cls: 'bg-success-light text-success' },
  pending:   { label: 'Pending',     cls: 'bg-warning-light text-warning' },
  inactive:  { label: 'Inactive',    cls: 'bg-surface-tertiary text-muted' },
  moved:     { label: 'Moved',       cls: 'bg-surface-tertiary text-muted' },
  deceased:  { label: 'Deceased',    cls: 'bg-surface-tertiary text-muted' },
  negative:  { label: 'Do not list', cls: 'bg-danger-light text-danger' },
  duplicate: { label: 'Duplicate',   cls: 'bg-danger-light text-danger' },
  delete:    { label: 'Delete',      cls: 'bg-danger-light text-danger' },
};

export const statusLabel = (s) => STATUS_STYLES[s]?.label ?? s;

export const statusChipCls = (s) => STATUS_STYLES[s]?.cls ?? 'bg-surface-tertiary text-muted';

export const ROLE_LABELS = {
  saint: 'Saint',
  helper: 'Helper',
  approver: 'Approver',
  admin: 'Admin',
};

export const roleLabel = (r) => ROLE_LABELS[r] ?? r;

export const formatPhone = (p) => p || null;

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : null);
