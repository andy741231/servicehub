// district-digest job (directory-migration.md §6.4) — daily at 06:00 CT.
// For every district, the helpers/approvers who have a contact email get one
// message with:
//   - yesterday's DirectoryAuditLog changes (the whole CT calendar day), and
//   - pending members re-listed every 3rd whole CT day of age — the legacy
//     phonelist's "NR reminder every 3 days" rule (day 3, 6, 9, ...).
// Empty digests are skipped entirely; a district with content but no
// recipients is skipped but recorded in the summary. Per-recipient send
// errors are collected, never thrown — one bad address can't kill the job
// or the other districts. In dry-run everything is computed (subject,
// recipients, counts, lines) and reported as a would-send list instead of
// emailing.

import {
  DIRECTORY_DISTRICTS,
  DIRECTORY_ROLES,
  DIRECTORY_STATUSES,
} from 'shared';
import { sendEmail } from '../services/emailService.js';

// Test seam — tests stub deps.sendEmail (same pattern as controllers/deps).
export const deps = { sendEmail };

const DAY_MS = 24 * 60 * 60 * 1000;
const CHANGES_TAKE = 500;    // audit rows fetched per district
const CHANGES_LIST = 100;    // lines rendered in the email ('+n more' after)
const REMINDER_EVERY = 3;    // pending re-listed every 3rd whole CT day
const WOULD_SEND_CAP = 50;   // recipient emails listed in dry-run summaries

// ── America/Chicago helpers (same Intl approach as scheduler.js) ─────────

const chicagoParts = (date) => {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)) {
    parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
};

// Instant → CT calendar date ('YYYY-MM-DD').
export const ctDateString = (date) => chicagoParts(date).date;

// Day-number for a 'YYYY-MM-DD' string (pure UTC date math — timezone-free).
const dayNumber = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
};

const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// How far UTC is ahead of CT local time at `date` (+5h CDT, +6h CST).
const ctOffsetMs = (date) => {
  const p = chicagoParts(date);
  return date.getTime()
    - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
};

// The UTC instant of 00:00:00 CT on a 'YYYY-MM-DD' date. US DST transitions
// happen at 02:00 local — never midnight — so the guess is at most one
// correction away; the second pass only matters if the offset flipped
// mid-correction.
const ctDayStartUtc = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  const firstGuess = midnightAsUtc + ctOffsetMs(new Date(midnightAsUtc));
  return new Date(midnightAsUtc + ctOffsetMs(new Date(firstGuess)));
};

// The UTC window covering yesterday's whole CT calendar day:
// { date: 'YYYY-MM-DD', start: <00:00 CT as UTC>, end: <24:00 CT as UTC> }.
// 'Yesterday' = the CT calendar date of (now − 24h); the digest runs at
// 06:00 CT so this is always the day that just ended.
export function yesterdayCtWindow(now) {
  const date = ctDateString(new Date(now.getTime() - DAY_MS));
  return { date, start: ctDayStartUtc(date), end: ctDayStartUtc(addDays(date, 1)) };
}

// ── email rendering ──────────────────────────────────────────────────────

// Minimal escaping for member-provided text inside the HTML body.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fullName = (m) =>
  [m?.firstName, m?.lastName].filter(Boolean).join(' ') || '(unknown member)';

const changeLine = (c) =>
  `${fullName(c.member)} — ${c.changeType} — ${c.actorName} — ${c.summary ?? ''}`;

const pendingLine = (m) => `${fullName(m)} — added ${ctDateString(m.addedAt)}`;

function renderEmail(district, date, changes, pending) {
  const shown = changes.slice(0, CHANGES_LIST);
  const more = changes.length - shown.length;
  const changeLines = shown.map(changeLine);
  const pendingLines = pending.map(pendingLine);
  const subject = `Directory digest — ${district} — ${date}`;

  const html = [
    `<p>Daily directory digest for <strong>${esc(district)}</strong>: ` +
      `changes from ${esc(date)} (CT) and pending records awaiting approval.</p>`,
    `<h3>Changes (${changes.length})</h3>`,
    changeLines.length
      ? `<ul>${changeLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '<p>None.</p>',
    more > 0 ? `<p>+${more} more</p>` : '',
    `<h3>Pending records needing approval (${pending.length})</h3>`,
    pendingLines.length
      ? `<ul>${pendingLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '<p>None.</p>',
  ].filter(Boolean).join('\n');

  const plainText = [
    `Directory digest — ${district} — ${date}`,
    '',
    `Changes (${changes.length})`,
    ...(changeLines.length ? changeLines.map((l) => `- ${l}`) : ['None.']),
    ...(more > 0 ? [`+${more} more`] : []),
    '',
    `Pending records needing approval (${pending.length})`,
    ...(pendingLines.length ? pendingLines.map((l) => `- ${l}`) : ['None.']),
  ].join('\n');

  return { subject, html, plainText, changeLines, pendingLines };
}

// ── the job ──────────────────────────────────────────────────────────────

const asDate = (now) => (typeof now === 'function' ? now() : now);

async function run({ prisma, now, dryRun }) {
  const at = asDate(now);
  const todayStr = ctDateString(at);
  const { date, start, end } = yesterdayCtWindow(at);
  // Records added before this instant have a CT whole-day age ≥ REMINDER_EVERY:
  // ctDate(addedAt) ≤ today−3 ⇔ addedAt < start of CT day (today−2). The DB
  // does the coarse filter; the exact day-multiple rule is applied below.
  const pendingAddedBefore = ctDayStartUtc(addDays(todayStr, -(REMINDER_EVERY - 1)));

  const districts = [];
  for (const district of DIRECTORY_DISTRICTS) {
    const [changeRows, pendingRows, recipients] = await Promise.all([
      prisma.directoryAuditLog.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          member: { district },
        },
        include: {
          member: { select: { firstName: true, lastName: true, district: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: CHANGES_TAKE,
      }),
      prisma.directoryMember.findMany({
        where: {
          district,
          status: DIRECTORY_STATUSES.PENDING,
          addedAt: { lt: pendingAddedBefore },
        },
        select: { firstName: true, lastName: true, addedAt: true },
        orderBy: { addedAt: 'asc' },
      }),
      prisma.directoryMember.findMany({
        where: {
          district,
          status: DIRECTORY_STATUSES.ACTIVE,
          role: { in: [DIRECTORY_ROLES.HELPER, DIRECTORY_ROLES.APPROVER] },
          email: { not: null },
        },
        select: { email: true, firstName: true, lastName: true },
      }),
    ]);

    // Whole-day age in CT = calendar days between addedAt's CT date and
    // today's. Listed on day 3, 6, 9, ... (legacy NR reminder every 3 days).
    const pending = pendingRows.filter((m) => {
      const age = dayNumber(todayStr) - dayNumber(ctDateString(m.addedAt));
      return age >= REMINDER_EVERY && age % REMINDER_EVERY === 0;
    });
    const changes = changeRows;

    const entry = {
      district,
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      changes: changes.length,
      pending: pending.length,
      skipped: null,
    };

    if (changes.length === 0 && pending.length === 0) {
      entry.skipped = 'empty'; // no digest for a quiet district
      districts.push(entry);
      continue;
    }
    if (recipients.length === 0) {
      entry.skipped = 'no-recipients';
      districts.push(entry);
      continue;
    }

    const email = renderEmail(district, date, changes, pending);
    entry.subject = email.subject;

    if (dryRun) {
      // Everything but the send — a human reviews this via GET /jobs.
      entry.skipped = 'dry-run';
      entry.wouldSend = recipients.map((r) => r.email).slice(0, WOULD_SEND_CAP);
      if (recipients.length > WOULD_SEND_CAP) {
        entry.wouldSendOmitted = recipients.length - WOULD_SEND_CAP;
      }
      entry.changeLines = email.changeLines;
      entry.pendingLines = email.pendingLines;
      districts.push(entry);
      continue;
    }

    const results = [];
    for (const r of recipients) {
      try {
        await deps.sendEmail(r.email, email.subject, email.html, {
          plainText: email.plainText,
        });
        results.push({ email: r.email, status: 'sent' });
        entry.sent += 1;
      } catch (err) {
        results.push({
          email: r.email,
          status: 'failed',
          error: String(err?.message ?? err),
        });
        entry.failed += 1;
      }
    }
    entry.results = results;
    districts.push(entry);
  }

  return { date, districts };
}

export const districtDigestJob = {
  name: 'district-digest',
  schedule: { dailyAt: '06:00' },
  run,
};
