// Pure Node port of the legacy Apps Script phonelist lookup
// (gas_v151: parse cmds.gs, lookup.gs, access phone list data.gs,
// sort assist.gs, some functions.gs) onto DirectoryMember records.
//
// No I/O and no side effects: `lookup` operates on the member list it is
// given (the saint/untrained view — active, opted-in rows only) and never
// mutates it. Deliberate departures from GAS, all one-way improvements:
//   * spouse links come from `spouseMemberId` (the directory is the source
//     of truth), not the sheet's Couple ID/head-of-household encoding;
//   * GAS's in-request row mutation (sister first-name swap, appended spouse
//     columns leaking into later searches) is not reproduced;
//   * members without a phone omit the ", nnn-nnn-nnnn" segment instead of
//     printing GAS's "-- (h)" garbage;
//   * `phonePrivacy === false` hides the phone entirely.

import { DIRECTORY_DISTRICT_SHORTNAMES } from 'shared';

// Trailer appended when the saint spelled out "lookup"/"look up"
// (parse cmds.gs ~line 44). Added after the results, before any hint.
export const LOOKUP_MSG =
  "'Lookup' no longer needed-- just type the name... also, you may search by last name... type 'last' name";

// Suggestion appended (once) to failed searches — suppressed when the user
// already typed 'last' or has seen it before (showSearchHint: false).
export const SEARCH_HINT =
  '\n\nHow to search\n - By first name -- john\n - By last name -- last smith\n - By full name -- john smith';

// ── Parsing ─────────────────────────────────────────────────────────────────

// GAS putUserRequestIntoAnObject: trim, drop the FIRST '#', lowercase,
// strip all double quotes, split on ' ', drop empty tokens.
export function tokenize(body) {
  return String(body ?? '')
    .trim()
    .replace('#', '')
    .toLowerCase()
    .replace(/"/g, '')
    .split(' ')
    .filter((w) => w.length > 0);
}

// { names, last, explicitLookup }
//   names          = tokens after the keyword count (1, or 2 when ' last ' is
//                    present) — so 'john last kim' yields ['last','kim'],
//                    exactly as the sheet did.
//   last           = the lowercased text (after the 'lookup' prefix is forced)
//                    contains ' last ' with spaces on both sides.
//   explicitLookup = the user typed 'lookup' or 'look up' as the first word(s).
export function parseLookupArgs(body) {
  const words = tokenize(body);
  const explicitLookup =
    (words[0] === 'look' && words[1] === 'up')
    || (words[0] === 'lookup' && words[1] !== 'myinfo');
  if (words[0] !== 'lookup' && words[0] !== 'find') words.unshift('lookup');
  const last = words.join(' ').indexOf(' last ') > -1;
  return { names: words.slice(last ? 2 : 1), last, explicitLookup };
}

// ── Phone formatting (some functions.gs: formatPhoneNo) ─────────────────────

// Strip - ( ) #, keep the rightmost 10 chars, render NNN-NNN-NNNN.
export function formatPhone(s) {
  const str = String(s).replace(/-|\)|\(|#/g, '');
  const digits = str.length > 10 ? str.substring(str.length - 10) : str;
  return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
}

// ── Member-level helpers ────────────────────────────────────────────────────

// '' when nothing should be shown (privacy, or no usable phone at all).
function displayPhone(m) {
  if (m.phonePrivacy === false) return '';
  if (m.phone1) return formatPhone(m.phone1);
  if (m.phone2) return `${formatPhone(m.phone2)} (h)`;
  return '';
}

function shortDistrict(m, districtShort) {
  return m.district ? (districtShort[m.district] ?? '') : '';
}

// GAS sorts a couple under the husband's first name. When the pair isn't
// exactly one brother + one sister the matched member leads.
function coupleOrder(matched, spouse) {
  const broMatched = matched.gender === 'brother';
  const broSpouse = spouse.gender === 'brother';
  if (broMatched !== broSpouse) return broMatched ? [matched, spouse] : [spouse, matched];
  return [matched, spouse];
}

// ── Row filtering (access phone list data.gs: returnFilteredDataForLookupCmd)

// lookFor encodes the target as 'first.last' (lastname may be ''). Returns the
// subset of `visible` matching under the case-10/11/20/21 rules, in the same
// order. `state.lastActive` stands in for 'last' in obCMD.keywrdsUserTyped
// (including the 'last' GAS injects mid-request on the case-1 fallback).
function filterForLookup(visible, lookFor, state) {
  const parts = lookFor.split('.');
  const p1 = parts[0];
  const p2 = parts[1] ?? '';
  const p1len = p1.length;
  let p2len = p2.length;
  const oneNameWasGiven = p2len === 0;
  let searchByLastName = state.lastActive;
  if (searchByLastName && oneNameWasGiven) p2len = p1len;

  let caseNo;
  if (oneNameWasGiven && !searchByLastName) caseNo = 10;
  else if (oneNameWasGiven && searchByLastName) caseNo = 11;
  else if (!oneNameWasGiven && !searchByLastName) caseNo = 20;
  else {
    caseNo = 21;
    if (state.exactMatch) {
      // multi-name exact search ignores 'last' (e.g. 'last jason wang')
      caseNo = 20;
      searchByLastName = false;
    }
  }

  return visible.filter((m) => {
    const fn = String(m.firstName ?? '');
    const ln = String(m.lastName ?? '');
    const firstname = state.exactMatch ? fn.toLowerCase() : fn.substring(0, p1len).toLowerCase();
    const lastname = state.exactMatch ? ln.toLowerCase() : ln.substring(0, p2len).toLowerCase();
    switch (caseNo) {
      case 10: return firstname === p1;
      case 11: return lastname === p1;
      case 20: return firstname === p1 && lastname === p2;
      case 21: return lastname === p2;
      default: return false;
    }
  });
}

// ── Result formatting (lookup.gs: getFormattedListOfMatchesForLookupCmd) ────

// One call = filter → attach spouse → dedupe → sort → format → limit, with its
// own hit counter. Returns { hits, text, ids } — hits/ids count people
// (a couple counts 2). The GAS not-found text uses the *typed* names and the
// current 'last' state.
function getFormattedList(lookFor, state) {
  const filtered = filterForLookup(state.visible, lookFor, state);

  if (filtered.length === 0) {
    const fnln = state.names.length === 1
      ? (state.lastActive ? 'Last name ' : 'First name ')
      : '';
    // String(array) joins with ',' — commas inside a token become spaces too.
    const typed = String(state.names).replace(/,/g, ' ');
    return { hits: 0, text: `${fnln}'${typed}' was not found`, ids: [] };
  }

  // Attach spouses; a spouse found in the visible set is removed from this
  // call's list whether their own row fell before or after the matched row.
  const skipIds = new Set();
  const entries = [];
  for (const m of filtered) {
    if (skipIds.has(m.id)) continue;
    const spouse = m.spouseMemberId != null ? state.byId.get(m.spouseMemberId) : undefined;
    if (spouse !== undefined) {
      skipIds.add(spouse.id);
      entries.push({ matched: m, spouse });
    } else {
      entries.push({ matched: m, spouse: null });
    }
  }
  const kept = entries.filter((e) => !skipIds.has(e.matched.id));

  // Stable sort by first name (locality is constant); couples sort under the
  // brother's name.
  const keyOf = (e) => String(e.spouse === null
    ? e.matched.firstName ?? ''
    : coupleOrder(e.matched, e.spouse)[0].firstName ?? '');
  kept.sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    return ka === kb ? 0 : (ka < kb ? -1 : 1);
  });

  let hits = 0;
  let text = '';
  const ids = [];
  for (const e of kept) {
    let block;
    if (e.spouse === null) {
      const m = e.matched;
      const phone = displayPhone(m);
      const dist = shortDistrict(m, state.districtShort);
      block = `${m.firstName} ${m.lastName}`
        + (phone ? `, ${phone}` : '')
        + (dist ? `, ${dist}` : '');
      hits += 1;
      ids.push(m.id);
    } else {
      const [bro, sis] = coupleOrder(e.matched, e.spouse);
      const sameLast = bro.lastName === sis.lastName;
      const broNM = bro.firstName + (sameLast ? '' : ` ${bro.lastName}`);
      const sisNM = `${sis.firstName} ${sameLast ? bro.lastName : sis.lastName}`;
      const dist = shortDistrict(e.matched, state.districtShort);
      const broPh = displayPhone(bro);
      const sisPh = displayPhone(sis);
      block = `${broNM} & ${sisNM}`
        + (dist ? `, ${dist}` : '')
        + `\n   ${bro.firstName}` + (broPh ? `,  ${broPh}` : '')
        + `\n   ${sis.firstName}` + (sisPh ? `,  ${sisPh}` : '');
      hits += 2;
      ids.push(bro.id, sis.id);
    }
    text += `\n\n${block}`;
    if (hits >= state.maxResults) {
      text += `\n\n--- results limited to ${state.maxResults}`;
      break;
    }
  }
  return { hits, text, ids };
}

// ── Compound first-name / nickname search ───────────────────────────────────

// lookup.gs: createArraysForCompoundNameSearchSuccess — picks out first names
// containing a space ("Mary Ann") and/or a parenthesized nickname
// ("Christopher (Chris)") from the visible rows.
function buildCompoundArrays(visible) {
  const compound = [];
  const full = [];
  for (const m of visible) {
    let firstname = String(m.firstName ?? '').trim();
    const split = firstname.split('(');
    if (split.length > 1) firstname = `${split[0]} (${split[1]}`;

    let lookingFor = ' ';
    let ndx = firstname.indexOf(lookingFor, 0);
    while (ndx > -1) {
      if (lookingFor === ' ') {
        const parts = firstname.split('(');
        compound.push(parts[0].replace(/ /g, '').toLowerCase());
        lookingFor = '(';
      } else {
        const parts = firstname.split('(');
        compound.push(parts[1].replace(/[ )]/g, '').toLowerCase());
        lookingFor = '$';
      }
      full.push([String(m.firstName ?? '').toLowerCase(), String(m.lastName ?? '').toLowerCase()]);
      ndx = firstname.indexOf(lookingFor, ndx + 1);
    }
  }
  return { compound, full };
}

// lookup.gs: searchForMatchOnCompoundFirstName — the typed names are
// concatenated with no separator, then matched exactly against the compound
// array; every hit triggers a fresh formatted search on that full name.
function searchCompoundFirstNames(names, compound, full, state) {
  let query = '';
  for (const n of names) query += n;

  let text = '';
  let numHits = 0;
  const ids = [];
  let ndx = compound.indexOf(query);
  while (ndx > -1) {
    const lookFor = `${full[ndx][0]}.${full[ndx][1]}`;
    const r = getFormattedList(lookFor, { ...state, exactMatch: true });
    if (r.hits > 0) {
      text += r.text;
      ids.push(...r.ids);
      numHits += 1;
    }
    ndx = compound.indexOf(query, ndx + 1);
  }
  return { numHits, text, ids };
}

// ── Command flow (lookup.gs: process_LOOKUP_command) ────────────────────────

// members: DirectoryMember-shaped rows (see loadLookupMembers for the select).
// args:    output of parseLookupArgs.
// opts:    { maxResults = 12, districtShort = DIRECTORY_DISTRICT_SHORTNAMES,
//            showSearchHint = true }
// Returns { text, hits, memberIds, searchHintShown }.
export function lookup(members, args = {}, opts = {}) {
  const { names = [], last = false, explicitLookup = false } = args ?? {};
  const {
    maxResults = 12,
    districtShort = DIRECTORY_DISTRICT_SHORTNAMES,
    showSearchHint = true,
  } = opts ?? {};

  const visible = (members ?? []).filter(
    (m) => m && m.status === 'active' && m.optedIn !== false);
  const byId = new Map(visible.map((m) => [m.id, m]));

  const state = {
    visible, byId, names, lastActive: last, exactMatch: true,
    maxResults, districtShort,
  };

  // The hint is armed only when the user didn't type 'last' and hasn't seen
  // it before (sheet: empty user settings / no 'srchSuggest' flag).
  const suggest1 = (!last && showSearchHint) ? SEARCH_HINT : '';
  let appendAfterResults = '';

  const compound = (!last)
    ? (() => {
      const { compound: keys, full } = buildCompoundArrays(visible);
      return searchCompoundFirstNames(names, keys, full, state);
    })()
    : { numHits: 0, text: '', ids: [] };

  const name0 = names.length > 0 ? String(names[0]) : '';
  const chars4 = name0.substring(0, 4); // getCharsUpto4
  let main = { hits: 0, text: '', ids: [] };

  switch (names.length) {
    case 1: {
      state.exactMatch = true;
      main = getFormattedList(`${name0.trim()}.`, state);
      if (main.hits > 0 || chars4.length < 3) break;

      if (name0.trim().length <= 3) {
        // too short to keep searching — show the hint (once) and stop
        appendAfterResults = suggest1;
        break;
      }
      if (compound.numHits > 0) break;

      // first-name search failed → convert to a last-name search. The injected
      // 'last' also governs the not-found prefix of the calls below.
      state.lastActive = true;
      main = getFormattedList(`${name0.trim()}.`, { ...state, exactMatch: true });
      if (main.hits === 0) {
        if (name0.trim().length >= 4) {
          const sixtyPerCent = Math.floor(name0.trim().length * 0.6);
          main = getFormattedList(
            `${chars4.substring(0, sixtyPerCent)}.`,
            { ...state, exactMatch: false });
        }
      } else {
        break;
      }
      if (main.hits === 0) {
        main.text = `${name0.trim()} was not found${suggest1}`;
      }
      break;
    }

    case 2: case 3: case 4: case 5: case 6: case 7: {
      const lastIdx = names.length - 1;
      main = getFormattedList(
        `${names[0].trim()}.${names[lastIdx].trim()}`,
        { ...state, exactMatch: true });
      if (main.hits > 0 || chars4.length < 2) break;

      let fourDownToTwo = chars4.length;
      do {
        main = getFormattedList(
          `${chars4.substring(0, fourDownToTwo)}.${String(names[lastIdx]).substring(0, 2)}`,
          { ...state, exactMatch: false });
        if (main.hits > 0 || chars4.length < 2) break;
        fourDownToTwo -= 1;
      } while (main.hits === 0 && fourDownToTwo > 1);
      break;
    }

    default:
      main = { hits: 0, text: 'Not found', ids: [] };
  }

  const display = compound.numHits > 0
    ? compound.text + (main.hits === 0 ? '' : main.text)
    : main.text;
  const memberIds = compound.numHits > 0
    ? [...compound.ids, ...(main.hits === 0 ? [] : main.ids)]
    : [...main.ids];

  const text = display.replace(/^\n+/, '')
    + (explicitLookup ? `\n\n${LOOKUP_MSG}` : '')
    + appendAfterResults;

  return {
    text,
    hits: memberIds.length,
    memberIds,
    searchHintShown: text.includes(SEARCH_HINT),
  };
}

// ── DB loader ───────────────────────────────────────────────────────────────

// Saints-visible members in base order: numeric legacyId ascending
// (parseFloat), non-numeric/null legacyIds last, ties broken by id — the
// sheet's row order was effectively cott order.
export async function loadLookupMembers(prisma) {
  const members = await prisma.directoryMember.findMany({
    where: { status: 'active', optedIn: true },
    select: {
      id: true,
      legacyId: true,
      firstName: true,
      lastName: true,
      gender: true,
      isHeadOfHousehold: true,
      district: true,
      phone1: true,
      phone2: true,
      phonePrivacy: true,
      spouseMemberId: true,
      optedIn: true,
      status: true,
    },
  });
  const key = (m) => {
    const n = m.legacyId == null ? NaN : parseFloat(m.legacyId);
    return Number.isNaN(n) ? Infinity : n;
  };
  return members.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return (ka - kb) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
}
