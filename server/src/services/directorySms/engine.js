// Transport-agnostic SMS command engine for the directory
// (directory-migration.md §6.2). Twilio specifics live in
// services/sms/twilioAdapter.js; this file never sees a request or a TwiML
// string. Port of the legacy flow: a doGet.gs → parse cmds.gs → commands1/2.gs,
// with per-number state on DirectorySmsPhone instead of the sheet.

import { canonicalPhone } from '../../utils/phone.js';
import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';
import { tokenize, parseLookupArgs, lookup, loadLookupMembers } from './lookup.js';

const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_REPLY_LEN = 1600;

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']);
const START_WORDS = new Set(['START', 'UNSTOP', 'YES']);
const RETIRED_COMMANDS = new Set(
  ['add', 'him', 'her', 'address', 'set', 'setsrv', 'pic', 'attendance', 'send', 'list']);
const STAFF_ROLES = new Set(['helper', 'approver', 'admin']);
const ROLE_RANK = { admin: 3, approver: 2, helper: 1, saint: 0 };

const highestRole = (members) =>
  members.reduce((top, m) =>
    (ROLE_RANK[m.role] ?? 0) > (ROLE_RANK[top] ?? 0) ? m.role : top, 'saint');

// The member we answer for: highest role wins (ties keep sheet order).
const requesterOf = (members) =>
  members.reduce((top, m) =>
    (ROLE_RANK[m.role] ?? 0) > (ROLE_RANK[top.role] ?? 0) ? m : top, members[0]);

// 'Christopher (Chris)' → 'CHRIS'; otherwise the first name itself.
const nickOf = (firstName) => {
  const m = /\(([^)]*)\)/.exec(firstName ?? '');
  return (m ? m[1] : firstName ?? '').trim();
};

const staffLine = (m) =>
  `${m.firstName} ${m.lastName}` + (m.role === 'approver' ? '*' : '')
  + (m.phone1 && m.phonePrivacy !== false ? `, ${m.phone1}` : '');

// Splits a reply into ≤limit chunks at '\n\n' block boundaries; a single
// oversized block is hard-cut.
function splitReply(text, limit = MAX_REPLY_LEN) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let current = '';
  for (const block of text.split('\n\n')) {
    const candidate = current ? current + '\n\n' + block : block;
    if (candidate.length <= limit) { current = candidate; continue; }
    if (current) { chunks.push(current); current = ''; }
    if (block.length <= limit) { current = block; continue; }
    for (let i = 0; i < block.length; i += limit) {
      chunks.push(block.slice(i, i + limit));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function createEngine({ prisma, getSettings, issueLoginLink, clientUrl }) {
  const staffUrl = `${(clientUrl || '').replace(/\/$/, '')}/directory`;

  async function handleInbound({ from, body, now = new Date() }) {
    const canonical = canonicalPhone(from);
    const phoneKey = canonical ? '+1' + canonical.replace(/\D/g, '') : String(from);
    const text = (body ?? '').trim();
    const upper = text.toUpperCase();

    const row = await prisma.directorySmsPhone.findUnique({ where: { phone: phoneKey } });
    // Per-request writes are batched into a single upsert at the end.
    const writes = { lastInboundAt: now };
    const pending = parsePending(row?.pendingCommand);
    const pendingValid = pending && row?.pendingExpiresAt && row.pendingExpiresAt > now;
    const clearPending = () => { writes.pendingCommand = null; writes.pendingExpiresAt = null; };
    const setPending = (obj) => {
      writes.pendingCommand = JSON.stringify(obj);
      writes.pendingExpiresAt = new Date(now.getTime() + PENDING_TTL_MS);
    };

    const settings = await getSettings(prisma);
    const trailer = settings['sms.messages.helpStopTrailer'];
    const members = canonical
      ? await prisma.directoryMember.findMany({
          where: { phone1: canonical, status: 'active' },
        })
      : [];
    const requester = members.length ? requesterOf(members) : null;
    const role = members.length ? highestRole(members) : null;
    const memberId = members.length === 1 ? members[0].id : null;

    const finish = (replies, command, memberIds = null) =>
      ({ replies, command, memberId, memberIds: memberIds ?? (memberId ? [memberId] : []) });

    // ── dispatch (mutates `writes`) ────────────────────────────────────────
    const run = async () => {
      // STOP family / START — carrier compliance replies come from Twilio.
      if (STOP_WORDS.has(upper)) {
        writes.optedOutAt = now;
        return finish([], 'stop');
      }
      if (START_WORDS.has(upper)) {
        writes.optedOutAt = null;
        return finish([], 'start');
      }
      if (row?.optedOutAt) return finish([], 'opted-out');

      // Kill switches.
      if (!settings['sms.acceptInbound']) {
        return finish([settings['sms.messages.tempUnavailable'] + '\n\n' + trailer],
          'unavailable');
      }
      if (settings['sms.testMode'] && !(settings['sms.devPhones'] ?? []).includes(phoneKey)) {
        return finish([settings['sms.messages.tempUnavailable']], 'test-mode');
      }

      // Auth: an unlisted (or malformed) number gets the not-recognized reply.
      if (!canonical || members.length === 0) {
        return finish([settings['sms.messages.notRecognized']], 'unrecognized');
      }

      if (text === '') return finish(['No command found'], 'no-command');

      // ── pending reply: a bare number continues an open command ──────────
      if (/^\d+$/.test(text)) {
        if (!pendingValid || !pending) {
          if (pending) clearPending(); // expired — drop it
          return finish([`${text} is not valid -- you don't have a command active`], 'reply');
        }
        if (text === '0') {
          clearPending();
          return finish([`'${pending.cmd}' cancelled`], pending.cmd);
        }
        if (pending.cmd === 'me') {
          const choices = pending.choices ?? [];
          const k = choices.length;
          const n = parseInt(text, 10);
          if (n >= 1 && n <= k) {
            const pick = await prisma.directoryMember.findFirst({
              where: { id: choices[n - 1], status: 'active', phone1: canonical },
            });
            if (pick) {
              clearPending();
              return finish([await linkReply(pick)], 'me', [pick.id]);
            }
          }
          return finish([`Expecting 1-${k}... try again`], 'me');
        }
        if (pending.cmd === 'gethelp') {
          const topics = helpTopics(settings, pending.role ?? 'saint').topics;
          const topic = topics.find((t) => t.n === text);
          if (topic) {
            return finish([await expandSrvOffc(topic.text)], 'gethelp');
          }
          const max = Math.max(0, ...topics.map((t) => parseInt(t.n, 10)).filter(Number.isFinite));
          return finish([`Expecting 1-${max}, try again`], 'gethelp');
        }
        return finish([`${text} is not valid -- you don't have a command active`], 'reply');
      }

      // ── command dispatch ────────────────────────────────────────────────
      const words = tokenize(text);
      const w0 = words[0];

      // 'my info' (two words) and 'myinfo' (one word) are retired spellings
      // of 'me' — V151 replies "Use 'Me' instead" to both.
      if ((w0 === 'my' && words[1] === 'info') || w0 === 'myinfo') {
        return finish([`Use 'Me' instead`], 'me');
      }

      if (w0 === 'me') {
        if (members.length === 1) return finish([await linkReply(members[0])], 'me', [members[0].id]);
        // Shared phone — ask which record (head of household first, then name).
        const choices = [...members].sort((a, b) =>
          (b.isHeadOfHousehold - a.isHeadOfHousehold) || a.firstName.localeCompare(b.firstName));
        setPending({ cmd: 'me', choices: choices.map((m) => m.id) });
        const menu = choices
          .map((m, i) => `${i + 1} - ${m.firstName} ${m.lastName}`)
          .join('\n');
        return finish([`Which record? Reply with a number:\n${menu}`], 'me',
          choices.map((m) => m.id));
      }

      if (w0 === 'get' || w0 === 'gethelp') {
        const topicRole = role === 'admin' ? 'approver' : role;
        setPending({ cmd: 'gethelp', role: topicRole });
        return finish([helpTopics(settings, topicRole).intro], 'gethelp');
      }

      if (RETIRED_COMMANDS.has(w0) && STAFF_ROLES.has(role)) {
        return finish([`This moved to the web: ${staffUrl}`], 'retired');
      }

      const kw = (settings['sms.keywords'] ?? [])
        .find((k) => k.word === w0);
      if (kw) {
        const url = kw[role === 'admin' ? 'approver' : role] ?? '';
        return finish(
          [url ? `${w0.toUpperCase()} --- ${url}`
               : 'This command is for service office saints only'],
          'keyword');
      }

      // Fall through: name lookup.
      const result = lookup(await loadLookupMembers(prisma), parseLookupArgs(text), {
        maxResults: settings['sms.maxResults'],
        showSearchHint: !row?.searchHintAt,
      });
      if (result.searchHintShown) writes.searchHintAt = now;
      return finish([result.text], 'lookup', result.memberIds);
    };

    const linkReply = async (member) => {
      const issued = await issueLoginLink(member);
      if (issued.cooldown) {
        return 'A sign-in link was just sent. You can request another in a minute.';
      }
      return `HI ${nickOf(member.firstName).toUpperCase()}, ` +
        `use this link to REVIEW or UPDATE your information:\n\n${issued.link}`;
    };

    const helpTopics = (s, r) => s['sms.helpTopics']?.[r] ?? { intro: '', topics: [] };

    // gethelp topic bodies can embed ###srv_offc### — cut the text there and
    // append this district's helpers/approvers (approvers marked '*').
    const expandSrvOffc = async (text) => {
      if (text.substring(0, 65).indexOf('###srv_offc###') === -1) return text;
      const helpers = await prisma.directoryMember.findMany({
        where: {
          district: requester.district,
          status: 'active',
          optedIn: true,
          role: { in: ['helper', 'approver'] },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });
      if (helpers.length === 0) return '<No phonelist helpers yet for your district>';
      const head = text
        .substring(0, text.indexOf('###srv_offc###'))
        .replace('your district',
          DIRECTORY_DISTRICT_SHORTNAMES[requester.district] ?? requester.district);
      return head + helpers.map(staffLine).join('\n');
    };

    const result = await run();

    // Steps 5–6 replies get the welcome prefix (once per number) and the
    // help/STOP trailer; earlier exits are already complete replies.
    const postProcessed = ['reply', 'no-command', 'me', 'gethelp', 'retired', 'keyword', 'lookup']
      .includes(result.command);
    if (postProcessed) {
      if (!row?.welcomedAt) {
        writes.welcomedAt = now;
        result.replies = result.replies.map((r) => settings['sms.messages.welcome'] + r);
      }
      result.replies = result.replies.map((r) =>
        r.includes(trailer) ? r : r + '\n\n' + trailer);
      result.replies = result.replies.flatMap((r) => splitReply(r));
    }

    // Only real NANP numbers get per-number state; a malformed From has no
    // valid key (and could overflow the NVarChar(32) id).
    if (canonical) {
      await prisma.directorySmsPhone.upsert({
        where: { phone: phoneKey },
        create: { phone: phoneKey, ...writes },
        update: writes,
      });
    }
    return result;
  }

  return { handleInbound };
}

function parsePending(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
