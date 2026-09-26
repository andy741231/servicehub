export const APP_IDS = {
  WEB: 'web',
  FORMS: 'forms',
  EMAIL: 'email',
  DIRECTORY: 'directory',
  PORTAL: 'portal',
};

// ── Directory sub-app ─────────────────────────────────────────────────────

// Canonical district names come straight from the phonelist sheet (the
// worksheet tab's wk_DistrictsTable). The 2024 PDF batch used other labels
// (Chinese 1-3, Katy, Spanish); migration 20260926 renames those rows.
export const DIRECTORY_DISTRICTS = [
  'Central 1', 'Central 2', 'Central 3',
  'C - Sugar Land', 'C - Diho', 'C - Medical Ctr',
  'S - Spanish Lang', 'Southwest', 'South', 'Southeast',
  'North', 'West',
];

export const DIRECTORY_ROLES = {
  SAINT: 'saint',
  HELPER: 'helper',
  APPROVER: 'approver',
  ADMIN: 'admin',
};

export const DIRECTORY_STATUSES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive',
  MOVED: 'moved',
  DECEASED: 'deceased',
  NEGATIVE: 'negative',
  DUPLICATE: 'duplicate',
  DELETE: 'delete',
};

export const DIRECTORY_MARITAL_STATUSES = ['single', 'married', 'widowed', 'divorced'];

export const DIRECTORY_GENDERS = ['brother', 'sister'];
