// Pure transform for the phonelist ("saints" tab) CSV import — no Prisma, no fs.
// All mapping, household pairing, shared-contact analysis, SMS-state seeding,
// report text and warnings-CSV formatting live here so they can be unit tested.
// Rows that can't be mapped collect a `fatal` warning; the CLI refuses to
// write anything while any fatal exists.

import { canonicalPhone } from '../../src/utils/phone.js';
import { DIRECTORY_DISTRICTS } from 'shared';

export const REQUIRED_COLUMNS = [
  'cott', 'Changed', 'Last change', 'Request by USER', 'User Settings',
  'Is Admin USER', 'Head of HHold', 'Active', 'District', 'First', 'Last',
  'Couple ID', 'Spouse (First name)', 'Spouse (Last name)', 'B/S',
  'Other Name', 'Small Group', 'Home', 'Cell', 'Email', 'Address', 'Apt',
  'City', 'ST', 'Zip', 'Locality', 'History', 'Contact ID',
];

// Known sheet columns that carry no member data. Anything else is reported as
// an ignored column.
export const DROPPED_COLUMNS = [
  'Link', 'Picture ID', 'Phone Provider',
  'Add new cols before this Col', "Insert 'formulas' before this Col",
];

export class Fatal extends Error {
  constructor(code, field, value, detail) {
    super(detail ?? `${code}: ${field}`);
    this.name = 'Fatal';
    this.code = code;
    this.field = field;
    this.value = value;
    this.detail = detail;
  }
}

// ── Header / text helpers ───────────────────────────────────────────────────

// Strip a BOM, collapse whitespace runs (incl. newlines) to one space, trim.
// An empty result drops the column (returns null).
export function normalizeHeader(header) {
  const s = String(header ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

// Collapse whitespace and trim; null unless the value has a letter or digit.
// The sheet uses "." (and runs of dashes) as its empty placeholder.
export function cleanText(v) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return /[\p{L}\p{N}]/u.test(s) ? s : null;
}

// Free-text spouse name: real text only — at least 2 chars containing a letter.
export function spouseText(v) {
  const s = cleanText(v);
  return s !== null && s.length >= 2 && /\p{L}/u.test(s) ? s : null;
}

const CJK_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;
export const isCjk = (s) => CJK_RE.test(s ?? '');

// ── Code-column mappers (trim + uppercase before lookup) ────────────────────

const STATUS_MAP = {
  A: 'active', NR: 'pending', NA: 'inactive', MOV: 'moved',
  DEL: 'delete', DUP: 'duplicate',
};

export function mapStatus(raw) {
  const v = String(raw ?? '').trim().toUpperCase();
  if (Object.hasOwn(STATUS_MAP, v)) return STATUS_MAP[v];
  throw new Fatal('UNMAPPED_STATUS', 'Active', raw, `unmapped Active value`);
}

const ROLE_MAP = { '': 'saint', APP: 'approver', HLP: 'helper', ADM: 'admin' };

export function mapRole(raw) {
  const v = String(raw ?? '').trim().toUpperCase();
  if (Object.hasOwn(ROLE_MAP, v)) return ROLE_MAP[v];
  throw new Fatal('UNMAPPED_ROLE', 'Is Admin USER', raw, `unmapped role value`);
}

// District is matched after whitespace normalization, case-insensitively.
const DISTRICT_MAP = new Map(Object.entries({
  'Central 1': 'Central 1', 'Central 2': 'Central 2', 'Central 3': 'Central 3',
  'C - Sugar Land': 'Chinese 1', 'C - Diho': 'Chinese 2', 'C - Medical Ctr': 'Chinese 3',
  'S - Spanish Lang': 'Spanish', 'Southwest': 'Southwest', 'South': 'South',
  'Southeast': 'Southeast', 'North': 'North', 'West': 'Katy',
}).map(([k, v]) => [k.toLowerCase(), v]));

export function mapDistrict(raw) {
  const v = String(raw ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (DISTRICT_MAP.has(v)) return DISTRICT_MAP.get(v);
  throw new Fatal('UNMAPPED_DISTRICT', 'District', raw, `unmapped district`);
}

const LOCALITY_MAP = { HOU: 'Houston', BEA: 'Beaumont' };

export function mapLocality(raw) {
  const v = String(raw ?? '').trim().toUpperCase();
  if (Object.hasOwn(LOCALITY_MAP, v)) return LOCALITY_MAP[v];
  throw new Fatal('UNMAPPED_LOCALITY', 'Locality', raw, `unmapped locality`);
}

const GENDER_MAP = { B: 'brother', S: 'sister' };

// Blank → null (caller emits MISSING_GENDER); anything unmapped is fatal.
export function mapGender(raw) {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '') return null;
  if (Object.hasOwn(GENDER_MAP, v)) return GENDER_MAP[v];
  throw new Fatal('UNMAPPED_GENDER', 'B/S', raw, `unmapped B/S value`);
}

export function mapHead(raw) {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === '' || v === '.') return false;
  if (v === 'H') return true;
  throw new Fatal('UNMAPPED_HEAD', 'Head of HHold', raw, `unmapped head-of-household value`);
}

// ── Contact fields ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { value, disp } where disp is kept | placeholder | invalid | blank.
export function mapEmail(raw) {
  const trimmed = String(raw ?? '').trim();
  const cleaned = cleanText(raw);
  if (cleaned === null) return { value: null, disp: trimmed === '' ? 'blank' : 'placeholder' };
  const email = trimmed.toLowerCase();
  if (!EMAIL_RE.test(email)) return { value: null, disp: 'invalid' };
  return { value: email, disp: 'kept' };
}

// m8 URL → people/c<decimal of trailing hex>; people/c<digits> kept as is.
export function mapContactId(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return { id: null, kind: 'blank' };
  if (/^people\/c\d+$/.test(s)) return { id: s, kind: 'people' };
  const m = s.match(/\/base\/([0-9a-f]+)$/i);
  if (m) return { id: `people/c${BigInt(`0x${m[1]}`)}`, kind: 'm8' };
  return { id: null, kind: 'unrecognized' };
}

// ── "Last change": M/D/YY HH:MM wall clock in --tz → UTC ────────────────────

const LAST_CHANGE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/;
const DTF_CACHE = new Map();

function dtf(tz) {
  if (!DTF_CACHE.has(tz)) {
    DTF_CACHE.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return DTF_CACHE.get(tz);
}

// Offset of `tz` at `ms` (wall-as-UTC minus instant), second resolution.
function tzOffsetMs(ms, tz) {
  const parts = {};
  for (const p of dtf(tz).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day,
    parts.hour % 24, parts.minute, parts.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

function wallClockToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const off1 = tzOffsetMs(guess, tz);
  let t = guess - off1;
  const off2 = tzOffsetMs(t, tz);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

export function parseLastChange(raw, tz) {
  const m = String(raw ?? '').trim().match(LAST_CHANGE_RE);
  if (!m) return null;
  const [, mo, d, yy, h, mi] = m;
  const [mon, day, hour, min] = [mo, d, h, mi].map(Number);
  if (mon < 1 || mon > 12 || day < 1 || day > 31 || hour > 23 || min > 59) return null;
  return wallClockToUtc(2000 + Number(yy), mon, day, hour, min, tz);
}

// ── SMS state from "Request by USER" / "User Settings" ──────────────────────

// Returns { stopped, stoppedAt, parseError }. Pending/non-stop commands are
// dropped (treated as no state). stoppedAt falls back to the as-of time.
export function parseSmsState(raw, asOf) {
  const s = String(raw ?? '').trim();
  if (s === '') return { stopped: false, stoppedAt: null, parseError: false };
  let j;
  try {
    j = JSON.parse(s);
  } catch {
    return { stopped: false, stoppedAt: null, parseError: true };
  }
  const status = String(j?.status ?? '').toUpperCase();
  const command = String(j?.command ?? '').toLowerCase();
  const stopped = status === 'STOPPED' || command === 'stop' || command === 'stopped';
  if (!stopped) return { stopped: false, stoppedAt: null, parseError: false };
  let stoppedAt = null;
  if (typeof j.time === 'string') {
    const d = new Date(j.time.replace(/[\u202f\u00a0]/g, ' '));
    if (!Number.isNaN(d.getTime())) stoppedAt = d;
  }
  return { stopped: true, stoppedAt: stoppedAt ?? asOf, parseError: false };
}

// importBatchId = phonelist-YYYYMMDD on the America/Chicago calendar date.
export function batchIdForAsOf(asOf) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(asOf)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return `phonelist-${parts.year}${parts.month}${parts.day}`;
}

// ── Per-row mapping ─────────────────────────────────────────────────────────

// Maps one sheet record into member `data` plus bookkeeping `meta`.
// ctx: { sheetRow, legacyId, warn }. Throws Fatal on unmapped values.
export function mapRow(rec, ctx, { asOf, tz, batchId }) {
  const warn = (code, field, value, detail) => ctx.warn('warn', code, field, value, detail);
  const data = {};

  data.legacyId = String(rec.cott ?? '').trim();
  data.status = mapStatus(rec.Active);
  data.role = mapRole(rec['Is Admin USER']);
  data.district = mapDistrict(rec.District);
  data.locality = mapLocality(rec.Locality);

  ctx.statusRaw = data.status;
  ctx.districtRaw = data.district;
  ctx.firstNameRaw = String(rec.First ?? '').trim();
  ctx.lastNameRaw = String(rec.Last ?? '').trim();

  data.gender = mapGender(rec['B/S']);
  if (data.gender === null) warn('MISSING_GENDER', 'B/S', rec['B/S'], 'blank gender');

  data.isHeadOfHousehold = mapHead(rec['Head of HHold']);

  data.firstName = cleanText(rec.First);
  data.lastName = cleanText(rec.Last);
  if (data.firstName === null || data.lastName === null) {
    throw new Fatal('MISSING_NAME', 'First/Last', `${rec.First ?? ''} / ${rec.Last ?? ''}`,
      'first or last name is empty');
  }

  data.otherName = cleanText(rec['Other Name']);
  data.smallGroup = cleanText(rec['Small Group']);
  data.address = cleanText(rec.Address);
  data.apartment = cleanText(rec.Apt);
  data.city = cleanText(rec.City);
  const st = cleanText(rec.ST);
  data.state = st !== null && /^[A-Za-z]{2}$/.test(st) ? st.toUpperCase() : st;
  data.zip = cleanText(rec.Zip);

  data.phone1 = canonicalPhone(rec.Cell);
  if (data.phone1 === null) warn('UNUSABLE_CELL', 'Cell', rec.Cell, 'cell is not a usable phone');
  const homeRaw = rec.Home;
  data.phone2 = canonicalPhone(homeRaw);
  if (data.phone2 === null && /\d/.test(String(homeRaw ?? ''))) {
    warn('UNUSABLE_HOME', 'Home', homeRaw, 'home has digits but is not a usable phone');
  }

  const email = mapEmail(rec.Email);
  data.email = email.value;
  if (email.disp === 'invalid') warn('INVALID_EMAIL', 'Email', rec.Email, 'invalid email');

  const contact = mapContactId(rec['Contact ID']);
  data.googleContactId = contact.id;
  if (contact.kind === 'unrecognized') {
    warn('UNRECOGNIZED_CONTACT_ID', 'Contact ID', rec['Contact ID'], 'unrecognized Contact ID');
  }

  const lastChange = parseLastChange(rec['Last change'], tz);
  if (lastChange === null) {
    warn('UNPARSEABLE_LAST_CHANGE', 'Last change', rec['Last change'], 'unparseable Last change');
  }
  data.changedAt = lastChange;
  data.lastVerifiedAt = lastChange;
  data.changeType = 'updated';
  data.changedByName = 'Phonelist sheet';
  data.source = 'phonelist-sheet';
  data.importBatchId = batchId;
  data.sourceAsOf = asOf;

  // Create-only defaults — never sent on update.
  data.optedIn = true;
  data.phonePrivacy = true;
  data.addressPrivacy = false;

  // Filled in by the household pass.
  data.spouseFirstName = null;
  data.spouseLastName = null;
  data.coupleId = null;
  data.maritalStatus = null;

  const legacyC = String(rec.Changed ?? '').trim().toUpperCase() === 'C';
  if (legacyC) ctx.warn('info', 'LEGACY_CHANGE_PENDING', 'Changed', rec.Changed, 'legacy dirty flag');

  const historyRaw = String(rec.History ?? '').trim();
  let historyIsJson = false;
  if (historyRaw !== '') {
    try {
      const j = JSON.parse(historyRaw);
      historyIsJson = j !== null && typeof j === 'object' && !Array.isArray(j);
    } catch { /* not JSON */ }
  }
  if (!historyIsJson) {
    ctx.warn('info', 'HISTORY_NOT_JSON', 'History', historyRaw, 'History is not a JSON object');
  }

  const sms = parseSmsState(rec['Request by USER'], asOf);
  if (sms.parseError) {
    warn('UNPARSEABLE_SMS_STATE', 'Request by USER', rec['Request by USER'], 'unparseable state JSON');
  }
  sms.welcomed = String(rec['User Settings'] ?? '').trim() !== '';
  if ((sms.stopped || sms.welcomed) && data.phone1 === null) {
    warn('SMS_STATE_NO_CELL', 'Cell', rec.Cell, 'SMS state but no usable cell');
  }

  return {
    data,
    meta: {
      coupleText: String(rec['Couple ID'] ?? '').trim(),
      spouseFirstRaw: rec['Spouse (First name)'],
      spouseLastRaw: rec['Spouse (Last name)'],
      emailDisp: email.disp,
      contactKind: contact.kind,
      historyRaw,
      historyIsJson,
      legacyC,
      lastChangeNull: lastChange === null,
      unusableCell: data.phone1 === null,
      sms,
    },
  };
}

// ── Full-sheet analysis ─────────────────────────────────────────────────────

export function analyzeSheet({ headers = [], records = [] }, { asOf, tz = 'America/Mexico_City', batchId } = {}) {
  const warnings = [];
  const push = (severity, code, ctx, field, value, detail) => warnings.push({
    severity, code,
    sheetRow: ctx?.sheetRow ?? '', legacyId: ctx?.legacyId ?? '',
    status: ctx?.statusRaw ?? '', district: ctx?.districtRaw ?? '',
    firstName: ctx?.firstNameRaw ?? '', lastName: ctx?.lastNameRaw ?? '',
    field: field ?? '', value: value ?? '', detail: detail ?? '',
  });

  // Header validation.
  const seen = new Set();
  for (const h of headers) {
    if (h === null || h === undefined) continue;
    if (seen.has(h)) {
      push('fatal', 'DUPLICATE_COLUMN', null, '(header)', h, `column "${h}" appears more than once`);
    }
    seen.add(h);
  }
  const present = new Set(headers.filter((h) => h !== null && h !== undefined));
  for (const col of REQUIRED_COLUMNS) {
    if (!present.has(col)) {
      push('fatal', 'MISSING_COLUMN', null, '(header)', col, `required column "${col}" is missing`);
    }
  }
  const known = new Set([...REQUIRED_COLUMNS, ...DROPPED_COLUMNS]);
  const ignoredColumns = [...present].filter((h) => !known.has(h));

  // Row filter, in order: blank cott → TST → duplicate legacyId.
  const dataLines = records.length;
  let blankCount = 0;
  const tstSkipped = [];
  const kept = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const sheetRow = i + 2; // sheet row 1 is the header
    const cott = String(rec.cott ?? '').trim();
    if (cott === '') { blankCount++; continue; }
    const ctx = {
      sheetRow, legacyId: cott,
      statusRaw: String(rec.Active ?? '').trim(),
      districtRaw: String(rec.District ?? '').replace(/\s+/g, ' ').trim(),
      firstNameRaw: String(rec.First ?? '').replace(/\s+/g, ' ').trim(),
      lastNameRaw: String(rec.Last ?? '').replace(/\s+/g, ' ').trim(),
    };
    if (ctx.statusRaw.toUpperCase() === 'TST') {
      tstSkipped.push({ sheetRow, legacyId: cott });
      push('info', 'TST_SKIPPED', ctx, 'Active', rec.Active, 'TST row skipped');
      continue;
    }
    kept.push({ rec, ctx });
  }
  const legacyCount = new Map();
  for (const { ctx } of kept) legacyCount.set(ctx.legacyId, (legacyCount.get(ctx.legacyId) ?? 0) + 1);

  const rows = [];
  for (const { rec, ctx } of kept) {
    ctx.warn = (sev, code, field, value, detail) => push(sev, code, ctx, field, value, detail);
    if (legacyCount.get(ctx.legacyId) > 1) {
      push('fatal', 'DUPLICATE_LEGACY_ID', ctx, 'cott', ctx.legacyId, 'duplicate legacyId');
      continue;
    }
    try {
      const { data, meta } = mapRow(rec, ctx, { asOf, tz, batchId });
      rows.push({
        sheetRow: ctx.sheetRow, legacyId: data.legacyId,
        coupleText: meta.coupleText, data, meta,
        linked: false, partnerLegacyId: null,
      });
    } catch (e) {
      if (!(e instanceof Fatal)) throw e;
      push('fatal', e.code, ctx, e.field, e.value, e.detail);
    }
  }

  // ── Households ──
  const groups = new Map();
  for (const row of rows) {
    const key = row.coupleText === '' ? `__blank__${row.legacyId}` : row.coupleText;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  for (const [key, members] of groups) {
    if (members.length === 2) {
      const [a, b] = members;
      const isBrotherSister = a.data.gender !== null && b.data.gender !== null
        && a.data.gender !== b.data.gender;
      if (isBrotherSister) {
        const activeCount = members.filter((m) => m.data.status === 'active').length;
        if (activeCount === 1) {
          for (const m of members) {
            ctxWarn(m, 'warn', 'MIXED_STATUS_PAIR', 'Couple ID', key,
              'exactly one spouse is active — not linked');
          }
        } else {
          a.linked = b.linked = true;
          a.partnerLegacyId = b.legacyId;
          b.partnerLegacyId = a.legacyId;
          a.data.coupleId = b.data.coupleId = `pl-${key}`;
          if (a.data.isHeadOfHousehold && b.data.isHeadOfHousehold) {
            for (const m of members) {
              ctxWarn(m, 'warn', 'TWO_HEADS', 'Head of HHold', 'H',
                'both spouses flagged head of household');
            }
          }
        }
      } else {
        for (const m of members) {
          ctxWarn(m, 'warn', 'SAME_GENDER_HOUSEHOLD', 'Couple ID', key,
            'couple is not brother+sister — not linked');
        }
      }
    } else if (members.length > 2) {
      for (const m of members) {
        ctxWarn(m, 'warn', 'LARGE_HOUSEHOLD', 'Couple ID', key,
          `${members.length} rows share this Couple ID — none linked`);
      }
    } else {
      const m = members[0];
      if (m.coupleText !== '' && m.coupleText !== m.legacyId) {
        ctxWarn(m, 'warn', 'ORPHAN_COUPLE_REF', 'Couple ID', m.coupleText,
          "Couple ID points at another row that isn't in this household");
      }
    }
  }

  function ctxWarn(row, sev, code, field, value, detail) {
    push(sev, code, {
      sheetRow: row.sheetRow, legacyId: row.legacyId,
      statusRaw: row.data.status, districtRaw: row.data.district,
      firstNameRaw: row.data.firstName ?? '', lastNameRaw: row.data.lastName ?? '',
    }, field, value, detail);
  }

  // Spouse text + marital status.
  for (const row of rows) {
    if (row.linked) {
      row.data.maritalStatus = 'married';
    } else {
      row.data.spouseFirstName = spouseText(row.meta.spouseFirstRaw);
      row.data.spouseLastName = spouseText(row.meta.spouseLastRaw);
      row.data.maritalStatus =
        (row.data.spouseFirstName !== null || row.data.spouseLastName !== null) ? 'married' : null;
    }
  }

  // ── Shared phones / emails (warnings are computed over all imported rows) ──
  const groupBy = (list, keyOf) => {
    const m = new Map();
    for (const item of list) {
      const k = keyOf(item);
      if (k === null || k === undefined) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(item);
    }
    return [...m.values()].filter((g) => g.length > 1);
  };
  const sameHousehold = (g) =>
    g[0].coupleText !== '' && g.every((r) => r.coupleText === g[0].coupleText);
  const sharedSummary = (shared) => ({
    numbers: shared.length,
    rows: shared.reduce((n, g) => n + g.length, 0),
    same: shared.filter(sameHousehold).length,
    cross: shared.filter((g) => !sameHousehold(g)).length,
  });

  const cellAll = groupBy(rows, (r) => r.data.phone1);
  const cellActive = groupBy(rows.filter((r) => r.data.status === 'active'), (r) => r.data.phone1);
  for (const g of cellAll) {
    for (const m of g) ctxWarn(m, 'warn', 'SHARED_CELL', 'Cell', m.data.phone1, 'cell shared by multiple rows');
  }
  const emailAll = groupBy(rows, (r) => r.data.email);
  const emailActive = groupBy(rows.filter((r) => r.data.status === 'active'), (r) => r.data.email);
  for (const g of emailAll) {
    for (const m of g) ctxWarn(m, 'warn', 'SHARED_EMAIL', 'Email', m.data.email, 'email shared by multiple rows');
  }

  // ── Contact-id duplicates ──
  const byContact = groupBy(rows, (r) => r.data.googleContactId);
  for (const g of byContact) {
    for (const m of g) {
      ctxWarn(m, 'warn', 'DUPLICATE_CONTACT_ID', 'Contact ID', m.data.googleContactId,
        'same googleContactId on multiple rows — kept both');
    }
  }

  // ── SMS phone seeds (merged per E.164 number) ──
  const smsPhones = new Map();
  for (const row of rows) {
    if (row.data.phone1 === null) continue;
    const { stopped, stoppedAt, welcomed } = row.meta.sms;
    if (!stopped && !welcomed) continue;
    const e164 = `+1${row.data.phone1.replace(/\D/g, '')}`;
    const seed = smsPhones.get(e164) ?? { optedOutAt: null, welcomedAt: null };
    if (stopped && (seed.optedOutAt === null || stoppedAt < seed.optedOutAt)) {
      seed.optedOutAt = stoppedAt;
    }
    if (welcomed) seed.welcomedAt = asOf;
    smsPhones.set(e164, seed);
  }

  // ── Stats for the report ──
  const matrix = (keyOf) => {
    const m = new Map();
    for (const row of rows) {
      const k = keyOf(row);
      if (!m.has(k)) m.set(k, new Map());
      const inner = m.get(k);
      inner.set(row.data.status, (inner.get(row.data.status) ?? 0) + 1);
    }
    return m;
  };

  const comboKey = (a, b) => [a.data.status, b.data.status].sort().join('/');
  const pairFlags = new Map(); // group members[] → 'linked' | 'mixed' | 'same' | 'large' | 'single'
  for (const members of groups.values()) {
    if (members.length === 2) {
      const g = members.map((m) => m.data.gender);
      const bs = g[0] !== null && g[1] !== null && g[0] !== g[1];
      const act = members.filter((m) => m.data.status === 'active').length;
      pairFlags.set(members, bs ? (act === 1 ? 'mixed' : 'linked') : 'same');
    } else {
      pairFlags.set(members, members.length > 2 ? 'large' : 'single');
    }
  }
  const combosFor = (kind) => {
    const combos = new Map();
    for (const [members, kind2] of pairFlags) {
      if (kind2 !== kind) continue;
      const k = comboKey(members[0], members[1]);
      combos.set(k, (combos.get(k) ?? 0) + 1);
    }
    return combos;
  };
  const countGroups = (kind) => [...pairFlags.values()].filter((k) => k === kind).length;

  const unlinkedSpouseText = rows.filter(
    (r) => !r.linked && (r.data.spouseFirstName !== null || r.data.spouseLastName !== null));

  const stats = {
    dataLines,
    blankCount,
    cottCount: dataLines - blankCount,
    tstSkipped,
    imported: rows.length,
    fatalCount: 0, // filled below
    districtStatus: matrix((r) => r.data.district),
    roleStatus: matrix((r) => r.data.role),
    statusTotals: matrix(() => 'all').get('all') ?? new Map(),
    unusableCellByStatus: (() => {
      const m = new Map();
      for (const r of rows) {
        if (r.meta.unusableCell) m.set(r.data.status, (m.get(r.data.status) ?? 0) + 1);
      }
      return m;
    })(),
    unusableHome: warnings.filter((w) => w.code === 'UNUSABLE_HOME').length,
    sharedCell: { all: sharedSummary(cellAll), active: sharedSummary(cellActive) },
    email: {
      kept: rows.filter((r) => r.meta.emailDisp === 'kept').length,
      placeholder: rows.filter((r) => r.meta.emailDisp === 'placeholder').length,
      invalid: rows.filter((r) => r.meta.emailDisp === 'invalid').length,
    },
    sharedEmail: { all: sharedSummary(emailAll), active: sharedSummary(emailActive) },
    households: {
      linkedCombos: combosFor('linked'),
      linkedTotal: countGroups('linked'),
      mixedCombos: combosFor('mixed'),
      mixedTotal: countGroups('mixed'),
      sameGender: countGroups('same'),
      large: countGroups('large'),
      orphans: rows.filter((r) => {
        const g = groups.get(r.coupleText === '' ? `__blank__${r.legacyId}` : r.coupleText);
        return g.length === 1 && r.coupleText !== '' && r.coupleText !== r.legacyId;
      }),
      twoHeads: [...pairFlags.entries()].filter(([members, kind]) => kind === 'linked'
        && members.every((m) => m.data.isHeadOfHousehold)).length,
      unlinkedSpouseText: {
        all: unlinkedSpouseText.length,
        active: unlinkedSpouseText.filter((r) => r.data.status === 'active').length,
      },
      married: rows.filter((r) => r.data.maritalStatus === 'married').length,
    },
    other: {
      otherNameKept: rows.filter((r) => r.data.otherName !== null).length,
      otherNameCjk: rows.filter((r) => isCjk(r.data.otherName)).length,
      contact: {
        m8: rows.filter((r) => r.meta.contactKind === 'm8').length,
        people: rows.filter((r) => r.meta.contactKind === 'people').length,
        blank: rows.filter((r) => r.meta.contactKind === 'blank').length,
        unrecognized: rows.filter((r) => r.meta.contactKind === 'unrecognized').length,
        dupIds: byContact.length,
        dupRows: byContact.reduce((n, g) => n + g.length, 0),
      },
      unparseableLastChange: rows.filter((r) => r.meta.lastChangeNull).length,
      historyNotJson: rows.filter((r) => !r.meta.historyIsJson).length,
      legacyC: rows.filter((r) => r.meta.legacyC).length,
    },
    sms: {
      phones: smsPhones.size,
      welcomed: [...smsPhones.values()].filter((p) => p.welcomedAt !== null).length,
      optedOut: [...smsPhones.values()].filter((p) => p.optedOutAt !== null).length,
      stateNoCell: warnings.filter((w) => w.code === 'SMS_STATE_NO_CELL').length,
      unparseable: warnings.filter((w) => w.code === 'UNPARSEABLE_SMS_STATE').length,
    },
  };
  stats.fatalCount = warnings.filter((w) => w.severity === 'fatal').length;

  return { batchId, asOf, tz, ignoredColumns, warnings, rows, smsPhones, stats };
}

// ── DB plan (pure — the CLI supplies fetched rows) ──────────────────────────

const COMPARE_TEXT = [
  'legacyId', 'firstName', 'lastName', 'otherName', 'gender', 'maritalStatus',
  'role', 'status', 'district', 'smallGroup', 'locality', 'email', 'phone1',
  'phone2', 'address', 'apartment', 'city', 'state', 'zip', 'spouseFirstName',
  'spouseLastName', 'changeType', 'changedByName', 'source', 'importBatchId',
  'googleContactId', 'coupleId',
];
const COMPARE_DATE = ['changedAt', 'lastVerifiedAt', 'sourceAsOf'];

const sameVal = (a, b) => (a ?? null) === (b ?? null);
const sameDate = (a, b) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

// Sheet-mapped-field equality. spouseMemberId is compared against the desired
// resolved member id; coupleId is inside COMPARE_TEXT. includeLinks=false
// skips spouseMemberId/coupleId (pass-1 writes never touch link fields).
export function memberEquals(existing, data, desiredSpouseId, { includeLinks = true } = {}) {
  for (const f of COMPARE_TEXT) {
    if (f === 'coupleId' && !includeLinks) continue;
    if (!sameVal(existing[f], data[f])) return false;
  }
  for (const f of COMPARE_DATE) {
    if (!sameDate(existing[f], data[f])) return false;
  }
  if (existing.isHeadOfHousehold !== data.isHeadOfHousehold) return false;
  if (includeLinks && !sameVal(existing.spouseMemberId, desiredSpouseId)) return false;
  return true;
}

// Fields written in pass 1 (create + update). Link fields and create-only
// defaults are handled separately.
const WRITE_FIELDS = [
  ...COMPARE_TEXT.filter((f) => f !== 'coupleId'),
  'isHeadOfHousehold', ...COMPARE_DATE,
];

export function writeData(data, { forCreate = false } = {}) {
  const out = {};
  for (const f of WRITE_FIELDS) out[f] = data[f];
  if (forCreate) {
    out.optedIn = data.optedIn;
    out.phonePrivacy = data.phonePrivacy;
    out.addressPrivacy = data.addressPrivacy;
  }
  return out;
}

// db = { members, accounts, legacyRows, nullLegacyRows, spousePointers, smsPhones }
//   members         existing members whose legacyId is in the CSV (full rows)
//   accounts        [{ memberId, email }] for those members
//   legacyRows      [{ legacyId, importBatchId }] for every member with a legacyId
//   nullLegacyRows  [{ source, importBatchId }] for every member without one
//   spousePointers  [{ id, legacyId, spouseMemberId }] pointing at imported ids
//   smsPhones       existing DirectorySmsPhone rows for the seed numbers
export function buildDbPlan(analysis, db) {
  const csvIds = new Set(analysis.rows.map((r) => r.legacyId));
  const existingByLegacy = new Map(db.members.map((m) => [m.legacyId, m]));

  const desiredSpouseId = (row) => {
    if (!row.partnerLegacyId) return null;
    const ex = existingByLegacy.get(row.partnerLegacyId);
    return ex ? ex.id : `new:${row.partnerLegacyId}`;
  };

  const creates = [];
  const updates = [];
  const unchanged = [];
  for (const row of analysis.rows) {
    const ex = existingByLegacy.get(row.legacyId);
    if (!ex) creates.push(row);
    else if (memberEquals(ex, row.data, desiredSpouseId(row))) unchanged.push({ row, existing: ex });
    else updates.push({ row, existing: ex });
  }

  // Conflicts: a non-imported member already points at a member we would link.
  const conflictTargets = new Set();
  for (const p of db.spousePointers) {
    if (!csvIds.has(p.legacyId ?? '')) conflictTargets.add(p.spouseMemberId);
  }
  const seenPairs = new Set();
  const conflictPairs = [];
  for (const row of analysis.rows) {
    if (!row.partnerLegacyId) continue;
    const key = [row.legacyId, row.partnerLegacyId].sort().join('|');
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    const idA = existingByLegacy.get(row.legacyId)?.id;
    const idB = existingByLegacy.get(row.partnerLegacyId)?.id;
    if ((idA && conflictTargets.has(idA)) || (idB && conflictTargets.has(idB))) {
      conflictPairs.push(key);
    }
  }
  const conflictPairSet = new Set(conflictPairs);

  // Link writes per imported member (phase A clears, phase B sets).
  let linksToSet = 0;
  let linksToClear = 0;
  const linkOps = new Map(); // legacyId → { desiredSpouse, desiredCouple, skip }
  for (const row of analysis.rows) {
    const pairKey = row.partnerLegacyId
      ? [row.legacyId, row.partnerLegacyId].sort().join('|') : null;
    const skip = pairKey !== null && conflictPairSet.has(pairKey);
    const desiredSpouse = skip
      ? (existingByLegacy.get(row.legacyId)?.spouseMemberId ?? null)
      : desiredSpouseId(row);
    const desiredCouple = skip ? (existingByLegacy.get(row.legacyId)?.coupleId ?? null)
      : row.data.coupleId;
    linkOps.set(row.legacyId, { desiredSpouse, desiredCouple, skip });
    const ex = existingByLegacy.get(row.legacyId);
    const curSpouse = ex?.spouseMemberId ?? null;
    const curCouple = ex?.coupleId ?? null;
    if (sameVal(curSpouse, desiredSpouse) && sameVal(curCouple, desiredCouple)) continue;
    if (ex && (curSpouse !== null || curCouple !== null)) linksToClear++;
    if (desiredSpouse !== null || desiredCouple !== null) linksToSet++;
  }

  // legacyId rows not represented in the CSV, counted by importBatchId.
  const legacyOutside = new Map();
  for (const r of db.legacyRows) {
    if (csvIds.has(r.legacyId)) continue;
    const k = r.importBatchId ?? '(no batch)';
    legacyOutside.set(k, (legacyOutside.get(k) ?? 0) + 1);
  }

  const nullLegacy = new Map();
  for (const r of db.nullLegacyRows) {
    const k = `${r.importBatchId ?? '(no batch)'} (${r.source ?? 'no source'})`;
    nullLegacy.set(k, (nullLegacy.get(k) ?? 0) + 1);
  }

  // DirectoryAccount email drift — counted only, never modified.
  const accountEmail = new Map(db.accounts.map((a) => [a.memberId, a.email]));
  let emailDrift = 0;
  for (const row of analysis.rows) {
    const ex = existingByLegacy.get(row.legacyId);
    if (!ex || !accountEmail.has(ex.id)) continue;
    if (!sameVal(accountEmail.get(ex.id), row.data.email)) emailDrift++;
  }

  const existingPhones = new Map(db.smsPhones.map((p) => [p.phone, p]));
  const sms = { create: [], fill: [], unchanged: [] };
  for (const [phone, seed] of analysis.smsPhones) {
    const ex = existingPhones.get(phone);
    if (!ex) sms.create.push(phone);
    else if ((ex.optedOutAt === null && seed.optedOutAt !== null)
      || (ex.welcomedAt === null && seed.welcomedAt !== null)) sms.fill.push(phone);
    else sms.unchanged.push(phone);
  }

  return {
    creates, updates, unchanged,
    linkOps, conflictPairs, linksToSet, linksToClear,
    conflictPointerCount: conflictTargets.size,
    legacyOutside, nullLegacy, emailDrift, sms,
    existingByLegacy,
  };
}

// ── Output formatting ───────────────────────────────────────────────────────

const SEV_RANK = { fatal: 0, warn: 1, info: 2 };

export function sortedWarnings(warnings) {
  return [...warnings].sort((a, b) =>
    (Number(a.sheetRow) || 1e9) - (Number(b.sheetRow) || 1e9)
    || SEV_RANK[a.severity] - SEV_RANK[b.severity]
    || String(a.code).localeCompare(String(b.code)));
}

// Cells that Excel would evaluate as a formula get a leading apostrophe.
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

const csvCell = (v) => {
  let s = String(v ?? '');
  if (FORMULA_TRIGGER_RE.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function formatWarningsCsv(warnings) {
  const header = 'severity,code,sheetRow,legacyId,status,district,firstName,lastName,field,value,detail';
  const lines = sortedWarnings(warnings).map((w) =>
    [w.severity, w.code, w.sheetRow, w.legacyId, w.status, w.district,
      w.firstName, w.lastName, w.field, w.value, w.detail].map(csvCell).join(','));
  // UTF-8 BOM so Excel renders accented/CJK names instead of mojibake.
  return '\uFEFF' + `${header}\n${lines.join('\n')}\n`;
}

// Reason the purge must be refused, or null when the target looks safe.
// An unparseable/empty database name refuses — the guard must fail closed.
export function purgeRefusal(name) {
  const n = String(name ?? '').trim();
  if (n === '' || n.toLowerCase() === 'unknown') {
    return 'database name is unknown — refusing to purge';
  }
  if (/prod/i.test(n)) return `database "${n}" looks like production — refusing to purge`;
  return null;
}

const STATUS_COLS = ['active', 'pending', 'inactive', 'moved', 'delete', 'duplicate', 'deceased', 'negative'];

function renderMatrix(map, rowOrder, title) {
  const statuses = STATUS_COLS.filter((s) =>
    [...map.values()].some((inner) => inner.has(s)));
  const lines = [title, `  ${''.padEnd(12)}${statuses.map((s) => s.padStart(9)).join('')}${'total'.padStart(9)}`];
  const totals = new Map();
  let grand = 0;
  const keys = rowOrder
    ? [...rowOrder.filter((k) => map.has(k)), ...[...map.keys()].filter((k) => !rowOrder.includes(k))]
    : [...map.keys()];
  for (const k of keys) {
    const inner = map.get(k);
    let sum = 0;
    const cells = statuses.map((s) => {
      const c = inner.get(s) ?? 0;
      sum += c;
      totals.set(s, (totals.get(s) ?? 0) + c);
      return String(c).padStart(9);
    });
    grand += sum;
    lines.push(`  ${String(k).padEnd(12)}${cells.join('')}${String(sum).padStart(9)}`);
  }
  lines.push(`  ${'total'.padEnd(12)}${statuses.map((s) => String(totals.get(s) ?? 0).padStart(9)).join('')}${String(grand).padStart(9)}`);
  return lines;
}

const fmtCombos = (combos) => {
  const parts = [...combos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return parts.map(([k, n]) => `${k} ${n}`).join(', ');
};

export function formatReport(analysis, {
  csvPath, dbTarget = 'offline', dbPlan = null, warningsCsvPath = '', apply = false,
} = {}) {
  const s = analysis.stats;
  const L = [];
  L.push(`Phonelist import — ${apply ? 'APPLY' : 'dry run'}`);
  L.push(`CSV:          ${csvPath}`);
  L.push(`Data lines:   ${s.dataLines}   blank: ${s.blankCount}   with cott: ${s.cottCount}`);
  L.push(`Batch:        ${analysis.batchId}`);
  L.push(`As-of:        ${analysis.asOf.toISOString()}`);
  L.push(`Sheet tz:     ${analysis.tz}`);
  L.push(`Target DB:    ${dbTarget}`);
  L.push(`Ignored cols: ${analysis.ignoredColumns.length ? analysis.ignoredColumns.join(', ') : 'none'}`);
  L.push('');
  L.push('Rows');
  L.push(`  Imported:      ${s.imported}`);
  const tst = s.tstSkipped;
  L.push(`  TST skipped:   ${tst.length}${tst.length
    ? ` (sheet rows ${tst.map((t) => t.sheetRow).join(', ')}; legacyIds ${tst.map((t) => t.legacyId).join(', ')})` : ''}`);
  L.push(`  Fatal problems: ${s.fatalCount}`);
  L.push('');
  L.push(...renderMatrix(s.districtStatus, DIRECTORY_DISTRICTS, 'District × status'));
  L.push('');
  L.push(...renderMatrix(s.roleStatus, ['saint', 'helper', 'approver', 'admin'], 'Role × status'));
  L.push('');
  L.push('Phones');
  const uc = s.unusableCellByStatus;
  const ucTotal = [...uc.values()].reduce((a, b) => a + b, 0);
  const ucParts = STATUS_COLS.filter((k) => uc.has(k)).map((k) => `${k} ${uc.get(k)}`).join(', ');
  L.push(`  Unusable cell: ${ucTotal}${ucTotal ? ` (${ucParts})` : ''}`);
  L.push(`  Unusable home: ${s.unusableHome}`);
  const sc = s.sharedCell;
  L.push(`  Shared cells (active rows): ${sc.active.numbers} numbers, ${sc.active.rows} rows (${sc.active.same} same-household, ${sc.active.cross} cross-household)`);
  L.push(`  Shared cells (all rows):    ${sc.all.numbers} numbers, ${sc.all.rows} rows (${sc.all.same} same-household, ${sc.all.cross} cross-household)`);
  L.push('');
  L.push('Emails');
  L.push(`  Kept: ${s.email.kept}   placeholder→null: ${s.email.placeholder}   invalid→null: ${s.email.invalid}`);
  const se = s.sharedEmail;
  L.push(`  Shared (active rows): ${se.active.numbers} addresses, ${se.active.rows} members`);
  L.push(`  Shared (all rows):    ${se.all.numbers} addresses, ${se.all.rows} members`);
  L.push('');
  L.push('Households');
  const hh = s.households;
  L.push(`  Linked pairs: ${hh.linkedTotal}${hh.linkedTotal ? ` (${fmtCombos(hh.linkedCombos)})` : ''}`);
  L.push(`  Mixed-status pairs (not linked): ${hh.mixedTotal}${hh.mixedTotal ? ` (${fmtCombos(hh.mixedCombos)})` : ''}`);
  L.push(`  Same-gender pairs: ${hh.sameGender}   groups >2: ${hh.large}   orphan couple refs: ${hh.orphans.length}${hh.orphans.length ? ` (legacyIds ${hh.orphans.map((r) => r.legacyId).join(', ')})` : ''}`);
  L.push(`  TWO_HEADS pairs: ${hh.twoHeads}`);
  L.push(`  Unlinked rows keeping spouse text: ${hh.unlinkedSpouseText.all} (${hh.unlinkedSpouseText.active} active)`);
  L.push(`  Married: ${hh.married}`);
  L.push('');
  L.push('Other');
  const o = s.other;
  L.push(`  otherName kept: ${o.otherNameKept} (CJK ${o.otherNameCjk})`);
  L.push(`  Contact ids: m8→people ${o.contact.m8}, people ${o.contact.people}, blank ${o.contact.blank}, unrecognized ${o.contact.unrecognized}; duplicate ids ${o.contact.dupIds} (${o.contact.dupRows} rows)`);
  L.push(`  Unparseable Last change: ${o.unparseableLastChange}`);
  L.push(`  History not JSON: ${o.historyNotJson}`);
  L.push(`  Legacy C flags: ${o.legacyC}`);
  L.push('');
  L.push('SMS');
  L.push(`  Phones to seed: ${s.sms.phones} (welcomed ${s.sms.welcomed}, opted out ${s.sms.optedOut})`);
  L.push(`  Rows with state but no usable cell: ${s.sms.stateNoCell}`);
  L.push(`  Unparseable state: ${s.sms.unparseable}`);
  L.push('');
  L.push('Fatal problems');
  const fatals = analysis.warnings.filter((w) => w.severity === 'fatal');
  if (!fatals.length) L.push('  none');
  for (const f of sortedWarnings(fatals)) {
    L.push(`  FATAL ${f.code} sheetRow ${f.sheetRow || '?'} legacyId ${f.legacyId || '?'} field ${f.field}`);
  }
  L.push('');
  if (dbPlan) {
    L.push(`DB plan (${apply ? 'apply' : 'dry run — no writes yet'})`);
    L.push(`  Members:      create ${dbPlan.creates.length} / update ${dbPlan.updates.length} / unchanged ${dbPlan.unchanged.length}`);
    L.push(`  Spouse links: ${dbPlan.linksToSet + dbPlan.linksToClear} link update(s) (${dbPlan.linksToSet} set, ${dbPlan.linksToClear} cleared); ${dbPlan.conflictPairs.length} conflicted pair(s) skipped (${dbPlan.conflictPointerCount} non-imported pointer(s))`);
    const lo = [...dbPlan.legacyOutside.entries()];
    L.push(`  Members with legacyId not in CSV: ${lo.length ? lo.map(([k, n]) => `${k}: ${n}`).join(', ') : 'none'}`);
    const nl = [...dbPlan.nullLegacy.entries()];
    L.push(`  Members with null legacyId: ${nl.length ? nl.map(([k, n]) => `${k}: ${n}`).join(', ') : 'none'}`);
    if (nl.length) {
      L.push('    → not touched by the import — in dev/test run --purge-batch <id> first or they\'ll duplicate the sheet rows');
    }
    L.push(`  Account email differs from sheet email: ${dbPlan.emailDrift}`);
    L.push(`  SMS phones:   create ${dbPlan.sms.create.length} / fill ${dbPlan.sms.fill.length} (${dbPlan.sms.unchanged.length} already complete)`);
  } else {
    L.push('DB plan: skipped (--offline)');
  }
  L.push('');
  L.push('Warnings by code');
  const byCode = new Map();
  for (const w of analysis.warnings) byCode.set(w.code, (byCode.get(w.code) ?? 0) + 1);
  const codes = [...byCode.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!codes.length) L.push('  none');
  for (const [code, n] of codes) L.push(`  ${code.padEnd(26)}${n}`);
  if (warningsCsvPath) L.push(`  Warnings CSV: ${warningsCsvPath}`);
  return `${L.join('\n')}\n`;
}
