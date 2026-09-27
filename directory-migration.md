# Directory Migration Plan — Phonelist (GAS + Twilio) → ServiceHub Directory

**Status:** Draft v1, 2026-09-25. Not yet approved.
**Supersedes:** `church-forms/directory.md` (the first draft). See §16 for what changed.

**Sources:** `church-forms/general/phonelist/phonelist.md` (reference for the legacy
system), `church-forms/directory.md`, `directory-startup.md` (requirements),
`.devin/skills/directory/SKILL.md` (the current Directory implementation). Items
marked *(verified)* were checked on 2026-09-25 against the live Twilio account,
the Azure subscription, the `stage` DB, and an export of the phonelist sheet.

---

## 1. Goal

Retire the Apps Script phonelist (Twilio → GAS → Google Sheet, with Cognito +
Zapier intake and a nightly GAS sync to Google Contacts) and run all of it on the
ServiceHub Directory (Express + Azure SQL). Saints keep texting
**713-257-9799**, and the Directory becomes the system of record.

**Success criteria**
- ServiceHub answers SMS lookups with the same results saints get today. Parity
  is proven by golden tests, and Directory privacy rules are applied.
- Every active saint with a cell phone can update their own record, with no
  Cognito link needed.
- Google Contacts groups stay current (sync is ported), and the satellite
  spreadsheets keep working (via sync-back).
- No Slack mirroring. SMS activity is logged privately.
- Rollback is possible for 7 days after cutover.

**Non-goals for this migration:** ACS SMS (the next migration, §13),
helper/approver SMS commands (the web UI covers them), photo MMS, carrier→email
redirect, and native exports to replace the satellite sheets.

## 2. Decisions (2026-09-25)

| # | Decision | Where |
|---|---|---|
| D1 | Twilio stays the SMS provider for now. The design must allow a later move to Azure Communication Services | §6.2, §13 |
| D2 | Google Contacts sync is **ported** to ServiceHub, and HOUSEKEEPING is retired | §6.5 |
| D3 | Day-one SMS is **saint commands only**: lookup, `me`, `get help`, keyword links, STOP/START. Helper commands move to the web UI | §6.2 |
| D4 | The satellite spreadsheets are fed by a **nightly sync-back** to the `saints` tab | §6.6 |
| D5 | **SMS sign-in link** plus **household editing** cover saints who have no unique email | §6.3 |
| D6 | No Slack. SMS activity goes to a private, admin-only table with a retention limit | §6.2 |
| D7 | The Twilio webhook moves from GET to **POST** and validates signatures, which keeps message bodies out of URLs and access logs | §6.2 |

---

## 3. Current state

### 3.1 Legacy system (what retires)

- **SEARCH V151**: the web app that receives the Twilio webhook.
- **HOUSEKEEPING**: nightly Contacts sync, district emails, and fix-ups for rows Zapier inserts.
- **Cognito form** `churchrecordsphonelist`, the Zapier "Phone list" folder, and Slack mirroring.

Full reference: `church-forms/general/phonelist/phonelist.md`.

### 3.2 ServiceHub Directory — architecture review *(verified)*

**Already in place (a solid foundation):**
- A full-stack sub-app:
  - Models: `DirectoryMember`, `DirectoryAccount`, `DirectoryAuditLog`, `DirectoryLoginToken`.
  - API: `/api/directory/*`.
  - UI: a saint shell at `/directory/*` and a staff UI at `/hub-admin/directory/*`.
- A separate directory session (cookie `directoryToken`, claim `kind:'directory'`),
  re-validated on every request.
- Magic links: hashed, one-time, valid 30 min. The SPA consumes them with a POST,
  so link previews can't use them up.
- Server-side privacy in `serializeMember` (`optedIn`, `phonePrivacy`,
  `addressPrivacy`), district-scoped staff powers, an audit row for every change,
  and provenance fields. These already cover the legacy "Rebuild recommendations".

**Gaps and blockers:**

| # | Finding | Impact | Fix (phase) |
|---|---|---|---|
| A1 | **All Directory code is uncommitted on `main`.** Controllers, routes, middleware, the migration `20260915_add_directory_tables`, and most pages are untracked | Never deployed. The only copy of this work is the local working tree | Commit to a feature branch and open a PR (P0, do soon) |
| A2 | The prod App Service has no **`CLIENT_URL`** | Magic links would point to `http://localhost:3000` | Set it (P0) |
| A3 | Prod has no **`AZURE_COMMUNICATION_CONNECTION_STRING` / `_SENDER_EMAIL`**, although the ACS resource `servicehub-email` exists | Prod can't send email, so magic links and digests fail | Set them (P0) |
| A4 | The rate limiter keys on `req.ip`, but there's no `trust proxy` behind IIS/iisnode | All clients probably share one bucket (10 sign-in requests per 5 min for the whole site). A launch announcement could lock everyone out | Derive client IP from `X-Forwarded-For`, verified on App Service (P0) |
| A5 | Only `express.json()` is mounted | Twilio posts form-encoded bodies | Add `express.urlencoded` on the SMS route only (P3) |
| A6 | `DirectoryAccount.email` is required and unique | Saints with no email, and spouses who share one, can't sign in | Make it nullable with a filtered unique index (P1/P4) |
| A7 | `requestMagicLink` uses `findFirst({ email })` | When spouses share an email, which one gets signed in is arbitrary | Choose deterministically and add household editing (P4) |
| A8 | Phones are stored as typed (`formatPhone` is a passthrough) | SMS auth can't reliably match `From` | Canonical `NNN-NNN-NNNN` on every write and in the importer (P0/P2) |
| A9 | There's no scheduler or background-job infrastructure | Needed for contacts sync, sync-back, digests, and purge | In-process scheduler with a DB lease (P5) |
| A10 | Staff search is a `contains` match on name, email, and phone | Doesn't match SMS lookup behavior (compound names, `last`, ordering) | A dedicated SMS matcher that reuses the privacy serializer (P3) |
| A11 | `/api/csrf-token` issues tokens but nothing checks them | Doesn't block webhooks. It's a general gap, partly covered by SameSite=lax | Track it; out of scope here |
| A12 | Photos go to local `uploads/`; the move to Blob storage is pending | Not relevant here (photo MMS is dropped) | Existing backlog |
| A13 | AGENT.md says local dev uses `test-servicehub`, but local `.env` uses `stage` | The docs are out of date | Update docs (P9) |

**Environment** *(verified)*

| Item | Value |
|---|---|
| App Service | `houstonservicehub`: Standard tier, **Always On**, 1 worker, with a `staging` slot |
| Slot-sticky settings | `DATABASE_URL`, `NODE_ENV` |
| Databases | prod slot → `production-servicehub` (Basic, always online). Staging slot → `test-servicehub` (serverless, auto-pauses after 60 min). Local `.env` → `stage` (serverless, auto-pauses after 60 min) |
| Directory data | In `stage`: 811 rows from the `pdf-2024-final` batch plus 2 manual test rows (2 accounts). The directory migration has never been deployed (it's untracked), so test and prod shouldn't have directory tables yet (not queried) |
| ACS | `servicehub-email`, data location United States |

### 3.3 Sheet data profile (export of 2026-09-25, `saints` tab)

- **Records:** 1,103 total: 840 `A`, 133 `MOV`, 95 `NA`, 32 `DEL`, 2 `TST`, 1 `NR`.
- **Active saints by district:** West 145, North 107, C - Sugar Land 88,
  Southwest 82, South 74, Central 1 65, Central 2 65, Southeast 58, C - Diho 50,
  C - Medical Ctr 45, S - Spanish Lang 38, Central 3 23.
- **Locality:** every active row is `HOU` (one inactive row is `BEA`). Cluster
  scoping and `@XXX` prefixes don't matter any more.
- **Roles (active):** 29 `APP`, 16 `HLP`, 0 `ADM`.
- **Email:** 114 active saints have none. 15 addresses are shared by 30 members
  (an earlier count of 16/34 treated the `.` placeholder on 4 rows as an address).
- **Cell:** 20 blank, plus 42 with a 1-digit placeholder, so **62 active saints
  have no cell number SMS can use**. 19 real numbers are each shared by 2 members
  (8 within the same couple, 11 across different households).
- **Couple ID:** every row has one. There are 236 real pairs (both spouses listed)
  and 368 single rows. On single rows the spouse free-text field has 73 real
  names, 178 placeholders (one character or punctuation), and 117 blanks.
- **Other Name:** 258 CJK, 10 other text, 379 one-character placeholders.
- **Other columns:** 832 of 840 active rows have a Google Contact ID. 2 have a
  Picture ID. Phone Provider is "Unknown" on 779.
- **SMS usage:** 320 active saints have `User Settings` (they've texted the
  service). 2 are in STOP state.

### 3.4 Twilio *(verified)*

| | Main | Test |
|---|---|---|
| Number | +1 713-257-9799 `PN708f5d4f4f1081748150391c21d2cae5` | +1 832-924-5571 `PNea83697a0e3b494adb5f642e5c670aae` |
| Messaging Service | `Phonelist Msg Service` `MGa1781408a85ac600dfceebaf025fdf5c` | `Phonelist testing alt#` `MGaa35605a19a5e6cb8f237cbd4da21f4e` |
| Inbound | Uses the number's own `sms_url` (`use_inbound_webhook_on_number=true`) → V151 `/exec`, GET | A separate GAS `/exec`, GET |
| Fallback URL | none | none |
| A2P 10DLC | Brand `BNe5307ae9965c2d2c739cb6d80d9863e2` APPROVED (vetted). Campaign is **CHARITY, VERIFIED**, with embedded links allowed | Same brand, CHARITY VERIFIED |

**What this means:**
- No new 10DLC registration is needed while we stay on Twilio.
- Sign-in links sent by SMS fall within the registered campaign.
- The test number gives us a real end-to-end path for staging.
- At cutover, changing the number's `SmsUrl` is enough.

---

## 4. Target architecture

```
Saint's phone ──SMS──> Twilio +1 713-257-9799 (Messaging Service, A2P CHARITY)
                          │ POST, X-Twilio-Signature           ▲ TwiML reply
                          ▼                                    │
   ServiceHub — App Service houstonservicehub (Express, Always On)
     /api/directory/sms ─ twilioAdapter ─ SMS engine ─┘   (transport-agnostic)
     /api/directory/*   ─ web: saints (/directory), staff (/hub-admin/directory)
     jobs: contacts-sync · sheet-sync-back · district-digest · maintenance
                          │ Prisma
                          ▼
            Azure SQL production-servicehub
                          │
     ├─> Google People API  (serviceoffice@ contacts + district/AllSaints groups)
     ├─> Google Sheets API  (phonelist `saints` tab, read-only mirror → satellites)
     └─> ACS Email          (magic links, district digests)
```

---

## 5. Data model changes (P1)

Follow the schema workflow in AGENT.md:
1. Run `prisma db push` on `stage`.
2. Hand-write an idempotent migration in
   `prisma/migrations/<date>_directory_sms_and_sync/migration.sql` (with
   `IF NOT EXISTS` guards). **Don't** add it to the workflow's `resolve` list.

```prisma
model DirectoryMember {
  // ...existing fields...
  legacyId        String?    // phonelist CognitoID, e.g. "827.1" — filtered unique
  googleContactId String?    // "people/c<hex>"
  googleSyncHash  String?    // hash of synced fields at last successful sync
  googleSyncedAt  DateTime?
  googleSyncError String?    @db.NVarChar(1000)
  @@index([phone1])
}

model DirectoryAccount {
  email String?              // was required; filtered unique WHERE email IS NOT NULL
}

model DirectorySmsPhone {    // opt-out/state is per phone number, not per member
  phone            String    @id              // E.164, e.g. +17135551234
  optedOutAt       DateTime?
  welcomedAt       DateTime?
  pendingCommand   String?   @db.NVarChar(Max) // JSON: { cmd, choices, ... }
  pendingExpiresAt DateTime?
  lastInboundAt    DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model DirectorySmsLog {
  id                String   @id @default(uuid())
  direction         String   // "in" | "out" | "simulated"
  phone             String
  memberId          String?
  command           String?
  body              String   @db.NVarChar(1600)
  providerMessageId String?
  status            String?
  createdAt         DateTime @default(now())
  @@index([createdAt])
  @@index([phone])
}

model DirectorySetting {
  key           String   @id
  value         String   @db.NVarChar(Max) // JSON
  updatedAt     DateTime @updatedAt
  updatedByName String?
}

model DirectoryJobRun {
  id         String    @id @default(uuid())
  job        String
  periodKey  String
  status     String    // "running" | "ok" | "failed" | "dry-run"
  summary    String?   @db.NVarChar(Max)
  startedAt  DateTime  @default(now())
  finishedAt DateTime?
  @@unique([job, periodKey])
}
```

- `legacyId` and `DirectoryAccount.email` need **filtered unique indexes**
  (`WHERE col IS NOT NULL`) created in the migration SQL. Prisma `@unique` can't
  express them (the same pattern as `userId`/`spouseMemberId`). Making `email`
  nullable requires dropping its existing unique index first.

---

## 6. Design

### 6.1 Phone identity

- **Canonical storage:** `NNN-NNN-NNNN` for 10-digit NANP numbers (existing rows
  already use it). The importer applies it, and so does every write path:
  `createMember`, `updateMember`, `updateMe`, and household edits.
- **Matching inbound texts:** Twilio's `From` (`+1NNNNNNNNNN`) is converted to
  canonical form and matched against `phone1` for `status='active'` members.
- **Unusable numbers:** placeholders and malformed values are stored as `null`
  and listed in the importer report.
- **Per-number state:** STOP state, the welcome flag, and pending replies live on
  the **phone number** (`DirectorySmsPhone`), so shared phones behave correctly.

### 6.2 SMS subsystem (P3)

**Files**
- `server/src/services/sms/twilioAdapter.js`:
  - `verifySignature(req)`
  - `parseInbound(req)` → `{ from, to, body, providerMessageId }`
  - `renderReply(texts)` → TwiML
  - `send({ to, body })` (REST call through `TWILIO_MESSAGING_SERVICE_SID`; not used on day one)
- `server/src/services/directorySms/engine.js`:
  `handleInbound({ phone, body, now })` → `{ replies, command, memberIds }`.
  It doesn't know about the transport; this is the seam where ACS plugs in later.
- `server/src/services/directorySms/lookup.js`: a port of `process_LOOKUP_command`,
  `searchForMatchOnCompoundFirstName`, `returnFilteredDataForLookupCmd`, and
  `sort assist.gs`. The golden tests (§9) define parity.
- `server/src/services/directorySms/settings.js`: typed getters over
  `DirectorySetting`, with defaults.
- `server/src/controllers/directorySms.js`:
  - `receiveTwilioSms`: verify → parse → engine → log → TwiML.
  - `simulateSms`: Hub admins only. Returns the replies as JSON, sends nothing,
    and logs them as `simulated`.
- Routes, added to `routes/directory.js` **before** the protected routes:
  - `POST /sms` with `express.urlencoded({ extended: false })`
  - `POST /sms/simulate` (Hub admin)

**Inbound flow**
1. Validate `X-Twilio-Signature` (HMAC-SHA1) against **`SMS_WEBHOOK_URL`**, the
   exact public URL, set per slot and slot-sticky. Don't rebuild the URL from
   proxy headers. If validation fails, return 403 and log the attempt without
   the body.
2. Canonicalize `From`, then load or create its `DirectorySmsPhone` row.
3. **STOP family** (STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT): set `optedOutAt`
   and send no reply; Twilio sends the compliance reply. **START/UNSTOP/YES**:
   clear it. While a number is opted out, never reply.
4. **Kill switches:** if `sms.acceptInbound` is off, or `sms.testMode` is on and
   the number isn't one of `sms.devPhones`, reply with the temporarily-unavailable message.
5. **Auth:** find active members with this phone. If there are none, send the
   not-recognized message, which tells them how to reach a helper.
6. **Pending reply:** a bare number while a pending command is still valid
   (10 min) continues that flow (a `get help` topic, or the member choice for `me`).
7. **Dispatch:**

   | Input | Behavior |
   |---|---|
   | bare text, `lookup <name>` | Name search across the whole church: `active` members with `optedIn`; phones hidden per `phonePrivacy` via `serializeMember`. Up to 12 results (`sms.maxResults`) showing name, phone, and district, in today's order |
   | `last <name>` | Last-name search |
   | `me` | One match: a one-time sign-in link (§6.3). Several matches (shared phone): "Reply 1 for …, 2 for …", then the link for the one they pick |
   | `get help` | Numbered topics for the member's role (saint/helper/approver). The reply stays pending so they can browse more topics |
   | exact single keyword | URL from the role-tiered keyword table. An unknown word falls through to lookup, as today |
   | retired helper commands (`add`, `him`, `her`, `address`, `set`, `setsrv`, `pic`, `attendance`, `send`) | Helpers/approvers get "This moved to the web: <staff URL>". Saints get a lookup (today's fall-through) |

8. The first text from a number gets the welcome message in front
   (`welcomedAt`). The help/STOP trailer is appended if the reply doesn't
   already have it.
9. Log the inbound and outbound rows and respond with synchronous TwiML.

**Replies:** There's **no slow path**. The prod DB is Basic tier and always
online, and the app has Always On. Keep replies ≤1,600 characters, and leave
Other Name out of lookup replies: CJK text forces UCS-2 encoding, which roughly
triples the number of segments.

**Security**
- Today's V151 `/exec` is `ANYONE_ANONYMOUS` and answers GET requests with any
  `From`, so anyone who has the URL can query the directory as any member.
  Signature validation closes that hole.
- Rate limit per phone number, in memory, because this is a single-instance app.

**Logging (D6):** `DirectorySmsLog` stores the full body and is visible only to
directory admins. A purge job enforces `sms.logRetentionDays` (default 180).
Nothing is sent to Slack or any other external system.

**Settings** (`DirectorySetting`, seeded from the `worksheet` tab and the HELP file)

| Key | Replaces |
|---|---|
| `sms.acceptInbound` | `wk_ACCEPT_DATA_FROM_TWILIO` |
| `sms.testMode`, `sms.devPhones` | `wk_RESPOND_TO_SAINTS_PHONES` (inverted), `wk_DevPhoneNos` |
| `sms.messages.{welcome,helpStopTrailer,tempUnavailable,notRecognized}` | `wk_WelcomeMessage`, `wk_HelpStopTrailer`, `wk_TempUnavilMSG`, hardcoded text |
| `sms.keywords` | `wk_SingleWordCommands` (saint/helper/approver columns) |
| `sms.helpTopics` | the HELP file spreadsheet (a page per role) |
| `sms.maxResults`, `sms.showSmallGroup` | 12, `wk_DisplaySmGrpOnSearchResults` |
| `sms.logRetentionDays` | new (180) |
| `districts.legacyNames`, `districts.contactGroups` | `wk_DistrictsTable` (name, shortname, Contacts group) |

On day one, settings are edited through the seed script. A settings admin UI comes later.

### 6.3 Sign-in extensions (P4, D5)

1. **Shared link issuing:** move token minting, supersede, and cooldown out of
   `requestMagicLink` into `issueLoginLink(member)`. Email and SMS both use it.
2. **Accounts without email:** `DirectoryAccount.email` becomes nullable.
   `findOrCreateAccountForMember` uses the member's email if it has one and
   another account isn't already using it; otherwise the account email is `null`.
3. **Shared emails:**
   - `requestMagicLink` picks the member whose account already owns the email,
     then the head of household, then the earliest `addedAt`.
   - When a staff member or the saint edits the email to one the linked spouse's
     account already uses, allow it: the member keeps the email and this
     account's email stays `null`. Other conflicts still return 409.
4. **Household editing:**
   - Spouses are two **active** members whose `spouseMemberId` points at each other.
   - `GET /api/directory/me` adds `household: [spouse]`, serialized with the full self view.
   - `PUT /api/directory/me/household/:memberId` updates the spouse's
     self-editable fields, using the same allowlist and validation as `updateMe`.
     The audit actor is the signed-in member, with a summary noting a household edit.
   - MyProfile gets a spouse section. Status, role, and district stay staff-only.

### 6.4 Background jobs (P5)

- `server/src/jobs/` starts from `index.js` after Prisma warms up, **only if
  `DIRECTORY_JOBS_ENABLED=true`**. That setting is slot-sticky and set only on
  the production slot.
- Dry runs are per job, via `DIRECTORY_JOBS_DRY_RUN=<job,...>`. New jobs start in dry run.
- A tick runs every 60 s. Schedules are evaluated in `America/Chicago` using `Intl`
  (App Service runs in UTC).
- **Lease:** a job claims its period by inserting a `DirectoryJobRun` row with
  `(job, periodKey)`. The unique index guarantees one run per period, even across
  restarts and slot swaps.
- Manual run: `POST /api/directory/jobs/:name/run` (Hub admin).

| Job | Schedule (CT) | What it does |
|---|---|---|
| `contacts-sync` | every 30 min | §6.5 |
| `sheet-sync-back` | daily 02:00, plus manual runs | §6.6 |
| `district-digest` | daily 06:00 | For each district, emails the helpers/approvers who have an email: yesterday's `DirectoryAuditLog` changes, plus `pending` members older than 3 days (repeated every 3 days, like today's NR reminder). Sent with ACS Email |
| `maintenance` | daily 03:30 | Purges SMS logs past retention, deletes used or expired login tokens older than 7 days, and clears expired pending SMS state |

**Staging safety:** the staging slot uses `test-servicehub`. Jobs stay disabled
there and are run only by hand, in dry run. That test DB will hold real saints'
data during E2E, so automatic email or Google writes from staging must never happen.

### 6.5 Google Contacts sync (P6, D2)

- Port `performContactsHousekeeping` and the `Contacts2` People API shim into
  `server/src/services/googleContacts.js`, driven by `contacts-sync`.
- **Change detection:** `googleSyncHash` is a SHA-256 of the synced fields (names,
  email, phones, district, status). Don't use `updatedAt`: Prisma's `@updatedAt`
  bumps it when the job writes back, which would loop forever.
- **Per member:**
  - **Active with a contact ID:** update names, email, and phones; set the `dist`
    custom field; move the contact to the district group from
    `districts.contactGroups` (e.g. `_C1`, `_CL2 (Chinatown)`). When an email is
    added, move the contact into an `AllSaintsNN` group with room (<498) and out
    of `SaintsNoEmail`. When an email is removed, do the reverse.
  - **Active with no contact ID:** search existing connections by email, then by
    name, to avoid duplicates, and only then create the contact. Store the ID.
  - **Not active** (`inactive/moved/deceased/negative/duplicate/delete`) **with a
    contact ID:** delete the contact and clear the ID. `pending` members get no
    contact, as with today's `NR`.
- **Legacy IDs:** the importer converts m8 feed URLs (`…/base/<hex>`) to
  `people/c<hex>`, following the rule in `Contacts2`.
- **Safety:**
  - Before the first live run, export every serviceoffice contact to JSON.
  - The first prod run is a dry run that lists every operation.
  - Circuit breaker: abort a run with more than 25 deletes or 50 creates unless
    it was started manually with an override.
  - Throttle writes to stay within People API per-user quotas.
  - **The expected first-run diff is about 0** (IDs are carried over and the data
    hasn't changed). A large diff means the mapping is wrong; stop and investigate.

### 6.6 Sheet sync-back (P6, D4)

- **Target:** spreadsheet `1KaU6JFCTJb282AxHR-9HOIY7tXfzIO0msNcyd5uJ4zI`, tab
  `saints`. That's what the satellites `IMPORTRANGE` from, so they keep working
  unchanged.
- **Layout:** write the exact legacy header row and all 38 columns, in the same
  order, and reverse-map the values:

  | Directory | Sheet |
  |---|---|
  | status: `active` / `pending` / `inactive` / `moved` / `duplicate` / `delete` | `A` / `NR` / `NA` / `MOV` / `DUP` / `DEL` |
  | status: `deceased`, `negative` | `NA` |
  | district | legacy district names |
  | role | `APP` / `HLP` / `ADM` / blank |
  | gender | `B` / `S` |
  | head of household | `H` / blank |
  | `legacyId` | `cott`; new members get `SH-<shortid>` |
  | `googleContactId` | Contact ID |

- **Preserve GAS-only columns during the rollback window:** Changed, Link,
  Request by USER, User Settings, History, Picture ID, Phone Provider, and the
  formula columns. Keep them for rows matched by `cott`, so GAS picks up cleanly
  if we roll back (§11).
- **Discovery first:**
  - Record each satellite's `IMPORTRANGE` range and the columns it references.
  - Confirm how row 2 is used (phonelist.md calls it a sample/format row).
  - Check the formula columns after "Insert 'formulas' before this Col".
- **Mechanics:** update in place by `cott` and append new Directory members
  after the last used row, with Sheets API `values.batchUpdate` (RAW). Rows
  whose `cott` isn't in Directory — the skipped `MOV`/`DEL` rows (§7.2) and any
  manual additions — stay in place; the job never deletes a sheet row. After
  cutover, protect the tab so only serviceoffice@ can edit it. The job is
  idempotent.

### 6.7 Google credentials (P6)

- **What's needed:** the `contacts` and `spreadsheets` scopes, acting as
  **serviceoffice@churchinhouston.org** (it owns the contacts and can edit the sheet).
- **Option A (recommended):** a service account with domain-wide delegation. A
  Workspace admin authorizes the account for those two scopes, and it
  impersonates serviceoffice@. The refresh token never expires.
- **Option B:** an OAuth refresh token from the existing OAuth client. This needs
  a new consent that grants both scopes (the current gdrive token is drive-only).
  The consent screen must be **Internal** or **In production**; in Testing mode,
  refresh tokens expire after 7 days.
- **Library:** use `google-auth-library` plus REST calls rather than the very
  large `googleapis` package, which would bloat the zip deploy.
- **Where the credentials live:** App Service settings, prod only, slot-sticky.

---

## 7. Data migration (P2)

### 7.1 District mapping — decided: sheet names are canonical

`DIRECTORY_DISTRICTS` uses the `saints` tab's own district values — the same
names the `worksheet` tab's `wk_DistrictsTable` assigns a shortname and a
Google Contacts group. The 2024 PDF batch used different labels; migration
`20260926_directory_district_names` renames those rows in place
(`Chinese 1→C - Sugar Land`, `Chinese 2→C - Diho`, `Chinese 3→C - Medical Ctr`,
`Spanish→S - Spanish Lang`, `Katy→West`). The importer additionally accepts the
PDF labels and worksheet shortnames as aliases, and fails on anything else.

| Sheet (= Directory) | Shortname | Contacts group | Active |
|---|---|---|---|
| Central 1 | C1 | `_C1` | 65 |
| Central 2 | C2 | `_C2` | 65 |
| Central 3 | C3 | `_C3` | 23 |
| C - Sugar Land | CL1 | `_CL1 (Sugar Land)` | 88 |
| C - Diho | CL2 | `_CL2 (Chinatown)` | 50 |
| C - Medical Ctr | CL3 | `_CL3 (Med Ctr)` | 45 |
| S - Spanish Lang | SL | `_Span lang` | 38 |
| Southwest | SW | `_Southwest` | 82 |
| South | S | `_South` | 74 |
| Southeast | SE | `_Southeast` | 58 |
| North | N | `_North` | 107 |
| West | W | `_West` | 145 |

**Display:** the full sheet name is what the UI shows everywhere. SMS replies
use the shortname (that's what legacy replies showed — `getDistrictDescription`
returns `DISTRICT_SHORTNAME`). Where the UI is compact enough to need the
shortname, render it with a tooltip (`title` attribute) like
`CL1 — C - Sugar Land`, and keep a staff-visible district reference table
(name · shortname · area · Contacts group) in the Directory staff area — see
S26. The `districts` settings map (§6.4 / S20) is the single source for
name ↔ shortname ↔ Contacts group.

### 7.2 Field mapping (all 38 columns)

| Sheet column | Target | Rule |
|---|---|---|
| *(every text column)* | — | `.` is the sheet's empty placeholder in almost every column. Whitespace is collapsed, and any value with no letter or digit (`.`, `--`, …) → `null` |
| `cott` | `legacyId` | Kept as a string (e.g. `827.1`) |
| Changed, Link | — | Dropped (the dirty flag and the Cognito edit URL). `C` flags are listed in the report |
| Last change | `changedAt`, `lastVerifiedAt` | Parse `M/D/YY HH:MM` as wall-clock time in `--tz`. The default is `America/Chicago` (Houston — US Central, observes DST). Confirmed by the admin: the sheet runs on US Central; `America/Mexico_City` is wrong here because Mexico dropped DST in late 2022. The member is stamped `changeType='updated'`, `changedByName='Phonelist sheet'` |
| Request by USER | `DirectorySmsPhone.optedOutAt` | JSON `status` `STOPPED` or `command` `stop` sets opted-out (at the JSON `time`, or at the export time). `STARTED` doesn't. Pending commands are dropped |
| User Settings | `DirectorySmsPhone.welcomedAt` | Any value means the number has already been welcomed |
| Is Admin USER | `role` | `APP`→approver, `HLP`→helper, `ADM`→admin, blank→saint |
| Head of HHold | `isHeadOfHousehold` | `H`→true. Blank or `.`→false (`.` marks the non-head spouse) |
| Active | `status` | `A`→active, `NR`→pending, `NA`→inactive, `DUP`→duplicate. **Skipped rows** (info, not fatal): `TST` test rows, and `MOV`/`DEL` — moved/deleted people aren't migrated; their sheet rows stay (§6.6 preserves them) and their numbers' SMS state still seeds, so a returning texter keeps STOP/welcomed flags |
| District | `district` | §7.1 |
| First, Last | `firstName`, `lastName` | Trim. A blank value is fatal |
| Couple ID | `coupleId`, `spouseMemberId` | A brother+sister group of 2 is linked: both get a shared `coupleId` (`pl-<Couple ID>`) and each `spouseMemberId` points at the other (second pass). **Not linked**, and reported instead: pairs where exactly one spouse is active (14 pairs, all active+inactive — every active row carries the typed spouse name, so display is unchanged; helpers hand-link genuine ones via the S26 review view), same-gender groups (1: two brothers sharing a household), and groups larger than 2. Pairs whose other spouse is a skipped `MOV`/`DEL` row surface as `ORPHAN_COUPLE_REF` |
| Spouse (First/Last) | `spouseFirstName/LastName` | Only on unlinked rows with real text (≥2 characters, with letters). Otherwise `null` |
| B/S | `gender` | `B`→brother, `S`→sister |
| Other Name | `otherName` | Keep CJK or real text. One-character placeholders → `null` |
| Small Group | `smallGroup` | Trim |
| Home | `phone2` | Canonical format |
| Cell | `phone1` | Canonical format. Placeholders → `null` |
| Email | `email` | Lowercase and trim. Malformed → `null` and reported |
| Address, Apt, City, ST, Zip | address fields | Trim. Zip is stored as a string. A 2-letter ST is uppercased |
| Locality | `locality` | `HOU`→Houston, `BEA`→Beaumont |
| History | `DirectoryAuditLog` | One `imported` row per member per batch (actor `import:<batch>`), with the raw History text in `summary` so nothing is lost. 13 cells hold a bare date serial instead of JSON; they're kept verbatim |
| Picture ID, Phone Provider | — | Dropped |
| Contact ID | `googleContactId` | m8 URL `…/base/<hex>` → `people/c<decimal of hex>`, since the People id is the decimal form of the old Contacts id (GAS never converted it; it fell back to matching by name/email). Existing `people/c…` values are kept. The S20 dry run confirms the mapping |
| *(derived)* | `maritalStatus` | Linked, or has a real spouse name → `married`. Otherwise `null` (don't guess) |
| *(new)* | `source`, `importBatchId`, `sourceAsOf` | `phonelist-sheet`, `phonelist-YYYYMMDD`, and the export time |
| *(defaults)* | `optedIn`, `phonePrivacy`, `addressPrivacy` | `true`, `true` (phones visible), `false` (addresses hidden). This matches today, where phones show to all saints and addresses only through the helper command |

### 7.3 Importer — `server/scripts/import-phonelist.mjs`

- **Input:** a CSV of the `saints` tab. A Drive export of the first tab is
  `saints`, and the file is parsed with the existing `csv-parser` dependency.
  Headers are whitespace-normalized (they contain line breaks), and a missing
  required column is fatal.
- **Flags:** `--as-of <ISO>` (export time; default = file mtime; sets the
  `phonelist-YYYYMMDD` batch id), `--tz <IANA>` (the zone of Last change),
  `--offline` (dry run without DB reads).
- **`--dry-run` (the default):** prints an aggregate-only report and writes the
  report plus a per-row warnings CSV (the only file with names) to `scratch/`
  (gitignored). With DB access it also shows the plan: create / update /
  unchanged, rows from other batches, and spouse-link conflicts. The report covers:
  - counts by status × district × role
  - skipped TST rows
  - unusable phones
  - shared phones and shared emails
  - couple pairs that resolved and ones left orphaned
  - unmapped values (these are fatal)
- **`--apply`:**
  - Refuses when there's any fatal problem, and asks you to type the target
    database name (`--yes` skips the prompt).
  - Upserts members keyed on `legacyId`, in batches with a transaction each.
    The sheet overwrites the fields it maps; privacy defaults apply on create only.
  - Links spouses in a second pass (it clears stale links first and never
    modifies non-imported members).
  - Writes the `imported` audit rows.
  - Seeds `DirectorySmsPhone`. It only ever fills STOP/welcome state and never clears it.
  - It's safe to re-run: the final cutover run is applied over earlier test imports.
- **`--purge-batch pdf-2024-final`:** dev/test only. Removes the old PDF import,
  which the sheet data replaces. It needs the explicit flag and a typed
  confirmation, and it refuses database names containing `prod`.

### 7.4 Pre-import cleanup (optional, in the sheet)

- The 62 active saints without a usable cell couldn't text the service before
  either, so this doesn't block the migration. Helpers can fill in numbers later
  from the importer report.
- Review the 11 cells shared across different households; they may be data errors.

### 7.5 Verification after each apply

- Counts per status × district match the sheet (after mapping), and every
  couple pair from the export is linked.
- A script picks 25 random records and diffs them field by field, sheet against DB.
- Every active member with a usable cell resolves when looked up by `From`.
- The contacts-sync dry run shows about 0 operations.

### 7.6 Staff data-review view (S26)

The import flags inconsistencies that need human judgment rather than guessing.
S26 adds a staff-facing **Data review** page (helpers + approvers, scoped to
their district; admins see all) listing each bucket with a link into the
member record to fix it:

- **Unlinked couples** — `coupleId` set but `spouseMemberId` null: the 14
  mixed-status pairs (link by hand if still together) and 6 `ORPHAN_COUPLE_REF`
  rows (clear the stale `coupleId` or link to the right record).
- **Shared contact info** — the cells/emails shared across households
  (`SHARED_CELL`/`SHARED_EMAIL` warnings); decide if they're real (a family
  number) or data errors.
- **Missing cells** — the 62 active saints with no usable cell, so helpers can
  fill them in (§7.4).
- **Same-gender households** — the 1 flagged group, to confirm or split.

The import warnings CSV is the seed list; the view queries live data (e.g.
`coupleId` set with `spouseMemberId` null) so it stays useful after cutover.
The district reference table (§7.1) lives on the same page.

---

## 8. Phases and done criteria

| Phase | Scope | Steps (§8.1) | Done when |
|---|---|---|---|
| **P0** Land & harden | Commit the Directory (feature branch → PR → CI applies `20260915_add_directory_tables`). Set prod `CLIENT_URL` and the ACS email settings. Fix client-IP rate limiting (A4). Canonicalize phones on writes (A8) | S1–S4 | The Directory is deployed to prod but not yet announced. A magic-link email arrives with the prod URL. The rate limiter separates clients |
| **P1** Schema | §5 models and the migration file | S5–S6 | `db push` works on `stage`, and CI applies the migration cleanly to test |
| **P2** Importer | §7 | S7–S9 | The dry-run report has been reviewed, the import is applied to `stage` and test, and §7.5 passes |
| **P3** SMS | §6.1–6.2 | S10–S14 | Unit tests pass. The golden suite passes, with every diff explained. The simulate endpoint works |
| **P4** Sign-in | §6.3 | S15–S16 | SMS-link sign-in works for members without email and for shared-email members. Household editing works E2E |
| **P5** Jobs | Scheduler, lease, `district-digest`, `maintenance` | S17–S18 | Each period runs exactly once across restarts. The digest dry-run output has been reviewed |
| **P6** Google | Credentials, contacts sync, sync-back, plus satellite discovery | S19–S21 | The contacts dry run shows about 0 diff. Sync-back into a *copy* of the sheet keeps a copied satellite identical |
| **P7** Staging E2E | Test number → staging slot (§9) | S22 | The sign-off checklist is complete |
| **P8** Cutover | §10 | S23 | Smoke tests pass and 7 days of monitoring are clean |
| **P9** Decommission | §12 | S24–S25 | GAS, Cognito, and Zapier are off, secrets are rotated, and docs are updated |

Dependencies: P0 → P1 → {P2, P3, P4, P5 in parallel} → P6 → P7 → P8 → P9.

### 8.1 Step assignments — pick a model per step

Each step below is sized to hand to a **fresh session**: attach this file (the
`§` references pull in the details), invoke the `directory` skill for
ServiceHub-side work, and ask for the step by ID ("do S7").

**Model** is a Devin CLI short name — `/model <name>` or
`devin --model <name>`; Fusion is selected with `/fusion`. Guidance:

- `fusion` — the default for anything substantial (frontier lead model +
  cost-efficient sidekick). When in doubt, use this.
- `swe` — fast and cheap; for small, fully-specified work.
- `codex` / `gemini` — only where a **second vendor's review** is worth it
  (a different model family catches different blind spots).
- `human` — console/secrets/decision work. Don't hand these to a model.

| Step | Phase | Task | Model | Notes |
|---|---|---|---|---|
| S1 | P0 | Commit the untracked Directory work → feature branch → PR (A1) | `swe` | Mechanical git + PR; eyeball the diff before merging |
| S2 | P0 | Set prod `CLIENT_URL` and the ACS email settings; verify a magic-link email arrives (A2, A3) | `human` | Azure portal + secrets |
| S3 | P0 | Fix client-IP rate limiting behind iisnode (A4) | `swe` | `X-Forwarded-For`; small targeted change |
| S4 | P0 | Canonicalize phone numbers on every write path (A8) | `swe` | Fixed rule (`NNN-NNN-NNNN`), known call sites |
| S5 | P1 | Edit `schema.prisma` per §5, `db push` to `stage` | `swe` | Spec is final |
| S6 | P1 | Hand-write the idempotent migration (filtered unique indexes; drop the old `email` unique first) | `fusion` | T-SQL traps: filtered `WHERE` indexes, `IF NOT EXISTS` guards |
| S7 | P2 | Write `import-phonelist.mjs`: full §7.2 mapping, two-pass spouse linking, `--dry-run` report | `fusion` | Largest rules-driven port; many edge cases |
| S8 | P2 | Review the dry-run report; confirm ⚠ district names (§15.1) | `human` | Judgment + open decisions |
| S9 | P2 | `--apply` to `stage`/test, then run the §7.5 verification | `swe` | Scripted counts + 25-record sampling |
| S10 | P3 | Port `lookup.js` from the GAS functions; build the golden suite (§9) | `fusion` | Faithful port: compound names, `last`, ordering |
| S11 | P3 | `twilioAdapter.js` (signature verify, parse, TwiML, send) + `engine.js` + `settings.js` | `fusion` | Security-sensitive; use Twilio's documented test vector |
| S12 | P3 | `controllers/directorySms.js`, routes, `simulate` endpoint | `swe` | Wiring on top of S10/S11 |
| S13 | P3 | Capture ~50 golden replies from V151; replay through `/sms/simulate` and diff | `swe` capture · `fusion` triage | Explaining diffs takes judgment |
| S14 | P3 | Security review: signature validation, per-phone rate limit, log privacy | `codex` or `gemini` | Second-vendor review of S10–S12 |
| S15 | P4 | `issueLoginLink(member)` refactor, nullable-email accounts, shared-email rules (§6.3.1–3) | `fusion` | Auth-adjacent conflict rules |
| S16 | P4 | Household editing: `household` in `/me`, `PUT /me/household/:memberId`, MyProfile spouse section | `fusion` | New endpoint + UI; permission edge cases |
| S26 | P4 | Staff data-review view: unlinked-couple hints, shared contacts, missing cells (§7.6) + district reference table (§7.1) | `fusion` | New scoped queries + UI; feeds S8/S9 cleanup |
| S17 | P5 | In-process scheduler + `DirectoryJobRun` lease + manual-run endpoint | `fusion` | Idempotency across restarts and slot swaps |
| S18 | P5 | `district-digest` and `maintenance` jobs | `swe` | Well-specified once S17 lands |
| S19 | P6 | Google credentials: DWD service account or OAuth consent (§6.7, §15.2) | `human` | Workspace admin console |
| S20 | P6 | Port `performContactsHousekeeping` → `googleContacts.js` (§6.5) | `fusion` | Deletes real contacts; get a `codex`/`gemini` review of the delete paths before the first live run |
| S21 | P6 | Satellite `IMPORTRANGE` discovery → sheet sync-back writer (§6.6) | `fusion` | Discovery is read-only (`swe`-able); the writer needs the exact 38-col reverse map |
| S22 | P7 | Staging E2E checklist (§9) via the test number | `human` + `swe` | Real SMS is manual; the agent can drive `simulate` cases and record evidence |
| S23 | P8 | Cutover runbook (§10) | `human` | Twilio console, Cognito/Zapier/GAS toggles, announcement |
| S24 | P9 | Decommission: disable triggers and zaps, archive the form, rotate secrets (§12) | `human` | Secrets + external consoles |
| S25 | P9 | Doc updates: `AGENT.md`, directory `SKILL.md`, church-forms docs | `swe` | Straightforward edits |

Ordering within a phase is top-to-bottom; P2–P5 steps may run in parallel per
the dependency line above. If a named model isn't available, `fusion` is a
safe substitute for any step.

---

## 9. Testing

**Unit tests** (`server/tests/`, run with `node --test`) cover:
- Twilio signatures, using Twilio's documented test vector
- phone canonicalization and command parsing
- the lookup matcher
- privacy: opted-out members and hidden phones never appear in SMS replies
- household-editing rules
- importer transforms
- the job lease

**Golden parity:**
- Before cutover, capture the replies to about 50 representative queries from
  V151, using its GET test path with a dev phone. While GAS is live, these
  requests still get mirrored to Slack.
- Replay the same queries through `/sms/simulate` against the imported data and
  diff the results.
- Document the expected differences: privacy masking, district names, and the trailer.

**Differential oracle (S10, done):** `server/scripts/gen-lookup-golden.mjs`
loads the real V151 `.gs` files into `node:vm` and runs the same query through
GAS and through `directorySms/lookup.js`. The synthetic suite
(`server/tests/fixtures/smsLookupGolden.json`, 59 cases) is committed and runs in
`smsLookup.test.mjs`; every case where the port differs from GAS must carry a
note. On the 2026-09-25 export: 991 generated queries, **960 exact**; the 31
others are all intended: 30 are the no-phone rendering (GAS printed `-- (h)`,
the port omits the segment) and 2 are the legacyId 51⇄52 cross-referenced
couple (unlinked by the importer, a GAS couple). The two causes overlap in one
query. Expected differences: opted-out members are hidden, `phonePrivacy=false`
hides the phone, households follow `spouseMemberId` (so a head-of-household
sister's couple links), ties among identical first names follow `legacyId`
order, leading blank lines are trimmed, and helpers get the saint view.

**Live capture/replay (S13, done 2026-09-27):** `scratch/capture-sms-golden.py`
hit the real V151 `/exec` with 58 queries from a listed approver phone;
`scratch/replay-sms-golden.mjs` replayed them through `/sms/simulate` on the
stage DB (both gitignored — they carry member data). Result: **every
non-lookup command matched byte-for-byte** (`get help` incl. all seeded HELP
topics, `myinfo`/`my info`, bare `lookup`/`last`, `lockup`/`xxxpayments`,
`0` cancels, no-match). `me` differs by design (magic link vs Cognito URL).
All 41 lookup diffs are intended and only these: legacy `(id)`s dropped,
inactive members excluded (freed slots pull in the next actives), `-- (h)`
junk-phone rendering, a couple shown as a single when its spouse is inactive
or unlinked (incl. the 51⇄52 pair), trimmed leading blanks. Fixing the
capture-found gaps (`myinfo`, bare-`lookup`/`last` early errors, real keyword
and HELP-topic seeds) raised exact matches 6 → 14; the remaining diffs are
the five categories above, verified line-by-line.

**Staging E2E:** point +1 832-924-5571 at the staging slot's `/api/directory/sms`
(POST) and cover these scenarios:
- an unknown number
- lookup variants
- `me` from a single-owner phone and from a shared phone
- sign-in, then editing your own record and your spouse's
- browsing `get help`
- keywords for each role
- STOP, then START
- the test-mode and accept-inbound switches
- a restart during a deploy, confirming the fallback TwiML is sent

**Warm up the staging DB first:** `test-servicehub` auto-pauses, and the first
request after a pause can take longer than Twilio's 15 s timeout.

**Link previews:** confirm that iMessage and Android previews don't use up the
one-time token. Only the SPA's POST should consume it.

---

## 10. Cutover runbook

**Before (T−7 to T−1):**
- P7 is signed off, the district mapping is confirmed, and helpers are briefed.
- Deploy the final code to prod with jobs disabled.
- Configure prod settings: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_MESSAGING_SERVICE_SID`, `SMS_WEBHOOK_URL` (sticky), and the Google
  credentials.
- Create a fallback **TwiML Bin** in the Twilio Console.
- Export a backup of the serviceoffice contacts.

**T0 (an evening window):**

1. **Freeze intake:**
   - Close the Cognito form `churchrecordsphonelist`.
   - Turn off the Zapier "Phone list" zaps.
   - Disable the HOUSEKEEPING triggers (nightly and onChange).

   GAS keeps answering SMS from the frozen sheet.
2. Export the `saints` tab as CSV → run the importer dry run against prod →
   review it → apply → verify (§7.5).
3. Seed the settings: keywords, help topics, messages, and district maps.
4. Update the main Twilio number:
   - `SmsUrl` = `https://houstonservicehub.azurewebsites.net/api/directory/sms`
   - `SmsMethod=POST`
   - `SmsFallbackUrl` = the TwiML Bin ("The directory is briefly unavailable — please try again in a few minutes.")
5. Smoke test from dev phones: lookup, `last`, `me` → sign in → edit your own
   and your spouse's record, `get help`, a keyword, STOP → START, and an unknown number.
6. **Jobs:**
   - Run `contacts-sync` as a dry run and review it (expect about 0 operations),
     then switch it to live.
   - Run `sheet-sync-back` by hand and confirm the satellites recalculate and match.
   - Enable `district-digest` and `maintenance`.
7. Tell the saints: texting works the same, and `me` now sends a sign-in link.

**T+1 to T+7:** check these every day:
- the SMS log (errors and the rate of unknown numbers)
- the digest emails
- the sync-back
- contacts operations

## 11. Rollback (from T0 to T+7)

- Point `SmsUrl` back to the V151 `/exec` (GET). Re-enable the HOUSEKEEPING
  triggers, the Cognito form, and the Zapier zaps.
- **Data:**
  - The sheet has the last sync-back.
  - Any ServiceHub edits made after it are listed from `DirectoryAuditLog` for
    re-entry by hand.
  - The GAS state columns were preserved (§6.6), so GAS picks up cleanly.
- If there's no rollback by T+7, close the window and move on to P9.

## 12. Decommission and security cleanup (T+30 or later)

- **GAS:** keep SEARCH V151 and HOUSEKEEPING as archives with their triggers off.
  Leave the old owner-locked project as it is.
- **Cognito and Zapier:** archive the Cognito form. Turn off the Zapier "Phone
  list" folder, including the broken SMS-logging zap.
- **Rotate the Twilio auth token.** It's hardcoded in GAS and has come up in
  workspace history. Update the App Service setting and `church-forms/.env`.
- **Revoke the Slack incoming webhook.** It's hardcoded in GAS and no longer needed.
- **Twilio 2FA recovery code:** move it out of `worksheet!F3` into a password manager.
- **The sheet:** it stays as the read-only mirror the satellites read from, with
  the tab protected. The GAS-only columns can then be blanked.
- **Docs:**
  - church-forms: `phonelist.md` (mark as retired), `directory.md` (mark as
    superseded), `AGENTS.md`.
  - servicehub: `AGENT.md` (DB names, jobs) and the directory `SKILL.md` (SMS,
    jobs, new models).

## 13. ACS readiness (the next migration)

- The SMS engine doesn't depend on the transport. To switch, add an
  `acsAdapter` that:
  - receives Event Grid `Microsoft.Communication.SMSReceived` events on a new
    route, after the subscription-validation handshake;
  - sends replies asynchronously through `@azure/communication-sms`;
  - handles delivery-report events.
- The ACS resource `servicehub-email` already exists, and its data location is
  United States, so the number can be ported to it. Reuse its connection string.
- **Required at that point:**
  - An ACS 10DLC brand and campaign registration. The Twilio CHARITY campaign
    doesn't carry over.
  - Port 713-257-9799 with an LOA. Twilio keeps serving the number until the port completes.
  - STOP handling may become the app's job; `DirectorySmsPhone.optedOutAt` already models it.
- See `church-forms/general/phonelist/phonelist.md` §Rebuild recommendations.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Uncommitted Directory code is lost or conflicts | P0: commit to a feature branch now |
| The district mapping is wrong, so records land in the wrong district or with the wrong helpers | Confirm ⚠ rows. The importer fails on unmapped values. Review the dry-run report |
| Contacts sync creates duplicates or deletes the wrong contacts | Back up first, run a dry run, require a first-run diff of about 0, use the circuit breaker, search before create |
| Sync-back breaks a satellite through column drift | Discover formulas first, write the exact layout, test on copies |
| Staging jobs touch real people | Jobs are gated to prod by a sticky env var. Staging runs only as manual dry runs |
| Twilio times out on a cold staging DB | Warm it up before tests. Prod is Basic and always online |
| A deploy restart during SMS traffic | Fallback TwiML; deploy off-hours |
| Everyone signs in at once after the announcement and trips the global rate-limit bucket | Fix A4 in P0 |
| Prod email isn't configured | Fix A2/A3 in P0 and verify |
| The Google refresh token expires | Use Option A (DWD), or an Internal/in-production consent screen |
| Sign-in links get filtered by carriers | The registered CHARITY campaign allows links. Monitor delivery; a custom domain is optional |
| SMS logs hold sensitive text | Admin-only access and a retention purge |

## 15. Open questions

1. ~~District mapping~~ **Decided (§7.1):** sheet names are canonical —
   `C - Sugar Land`, `C - Diho`, `C - Medical Ctr`, `S - Spanish Lang`, `West`;
   the existing `Chinese 1–3`/`Spanish`/`Katy` rows are renamed to match.
   Display: full name in the UI, shortname in SMS, tooltip + reference table
   per S26.
2. **Google auth:** a DWD service account (needs a Workspace admin), or an OAuth
   refresh token (what's the consent screen's status)?
3. **SMS logs:** is the default OK — full bodies, admin-only, kept 180 days?
4. **Household editing scope:** any spouses linked to each other (the default),
   or only spouses who share an email or phone?
5. **Digest recipients:** district helpers and approvers who have an email (the default)?
6. **Imported verification:** set `lastVerifiedAt` to the legacy "Last change"
   (the default), or show every imported record as unverified?
7. Add **`attendance`** as an SMS command for helpers on day one? It's a trivial,
   per-district link.
8. Use a **custom domain** for sign-in links (e.g. `directory.churchinhouston.org`)?
9. Pick the **cutover date and window**, and who announces it to helpers and saints.
10. When should the **settings admin UI** be built? (Day one uses the seed script.)
11. ~~Sheet time zone~~ **Decided:** `America/Chicago` (US Central, observes
    DST). Confirmed by the admin; `America/Mexico_City` was wrong because
    Mexico dropped DST in 2022.
12. ~~Mixed couples~~ **Decided:** stay unlinked — helpers hand-link the
    genuine ones via the S26 review view. Every active row keeps the typed
    spouse name, so display is unchanged.

## 16. Changes vs `church-forms/directory.md`

- **Districts:** `DIRECTORY_DISTRICTS` now uses the sheet's own names; the 2024
  PDF labels are renamed by a migration (§7.1).
- **Field mapping additions:**
  - Spouse names, Other Name, and Last change.
  - Couple ID is a household ID on every row, with only 236 real pairs.
  - `.` in Head of HHold marks the non-head spouse.
  - 1-digit placeholders appear in Cell.
- **Dropped:**
  - Locality/cluster and `@XXX` logic, since every active row is `HOU`.
  - Carrier→email redirect: 779 of 840 carriers are unknown, and the registered
    10DLC campaign allows links.
- **Logging:** "SmsLog + optional webhook out" is now a private log only, with no
  webhook, per the no-Slack decision.
- **Decided:** Contacts sync is ported, satellites use sync-back, and the sign-in
  gap is covered by SMS links plus household editing.
- **Twilio (verified):** 10DLC is already registered, a test number exists, and
  the number's own webhook is in effect.
- **New findings:** the Directory isn't committed or deployed yet, and prod
  settings are missing (A1–A4). The staging DB auto-pauses. The prod DB is Basic
  and always online.
