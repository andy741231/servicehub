---
name: service-hub-directory-page
description: "[directory] Guide for building the Directory sub-app."
---

# Directory (`client/src/pages/directory`)

## Overview
The Directory sub-app is a **church phone list** (per `directory-startup.md`):
saints look each other up for fellowship; helpers/approvers manage records
district-scoped; privacy flags control what other saints can see. Full stack —
Prisma models, `/api/directory` routes, and React pages are all implemented.

## Auth model (IMPORTANT)
Two separate session kinds reach `/api/directory/*`:

- **Directory session** (`directoryToken` cookie, `kind: 'directory'` JWT) —
  saints/helpers/approvers at `/directory/*`. Identity is a `DirectoryAccount`
  row keyed to `memberId`, NOT the Hub `User` table. Validated every request:
  account enabled + `sessionVersion` match + member `status === 'active'`.
  Status changes bump `sessionVersion` → instant revocation. Middleware:
  `server/src/middleware/directoryAuth.js` (`verifyDirectoryAccess`).
- **Hub session** (`token` cookie) — platform admins and Hub users with the
  `directory` app permission. `getDirectoryContext()` resolves their member
  via `DirectoryMember.userId`; platform `admin`/`super_admin` → directory
  admin. A linked member that isn't `active` gets no context.

A directory JWT can NEVER authorize Hub routes (different cookie name +
`kind` claim). Hub users browsing `/hub-admin/directory/*` keep Hub auth;
`req.authKind` tells the controller which path authenticated.

- Magic links: `POST /api/directory/auth/request-link` → hashed one-time
  token (30 min, atomic consume, supersedes older links). `verify` issues the
  30-day directory session. Rate-limited per IP.
- `POST /api/directory/auth/password` sets `DirectoryAccount.passwordHash`
  (never touches the Hub `User.password`). `GET /auth/me` bootstraps the
  client session; `POST /auth/logout` clears the cookie.
- Member `email` doubles as the login email — staff/self email edits sync
  `DirectoryAccount.email` (409 on conflicts).

## Domain rules
- **Roles** (on `DirectoryMember.role`): `saint | helper | approver | admin`.
  Platform `admin`/`super_admin` count as directory `admin`. Helpers/approvers
  are scoped to their own `district` server-side.
- **Statuses** (`DirectoryMember.status`): `pending | active | inactive |
  moved | deceased | negative | duplicate | delete`. `pending` = added but
  not yet approved (approver activates). `inactive` = was active, now
  deactivated. Non-active records are hidden from saints. **Removed**
  statuses (moved/deceased/negative/duplicate/delete) are approver/admin
  only — helpers never see or manage them. Hard delete allowed only for
  `duplicate` records.
- **Privacy**: `phonePrivacy` (default true) gates phone fields;
  `addressPrivacy` (default false) gates address fields; `optedIn` gates
  directory presence entirely. Masking is server-side in `serializeMember()`:
  saints get an explicit field allowlist + `phoneVisible`/`addressVisible`
  hints (UI shows "Not provided" vs "Hidden"); authorized staff/self get the
  full record minus internal ids (`userId`, `coupleId`, `account`, …).
- **Provenance**: `source` ('pdf-2024' | 'manual'), `importBatchId`,
  `sourceAsOf`, `lastVerifiedAt`. Imported rows show "not yet verified" to
  staff until verified (detail dialog button or any staff edit).
- **Districts**: fixed list of 12 in `shared/constants.js`
  (`DIRECTORY_DISTRICTS`), enforced server-side.
- **Household**: `spouseMemberId` self-link + shared `coupleId`;
  `isHeadOfHousehold`; free-text `spouseFirstName/LastName` for non-listed
  spouses.
- **Self-service**: `GET/PUT /api/directory/me` (My Profile) resolves via
  `ctx.member` — works for directory sessions and linked Hub users.
- **Audit**: every change writes a `DirectoryAuditLog` row and stamps
  `changeType/changedAt/changedByName` on the member. `actorId` is the
  DirectoryAccount id for directory sessions, Hub user id for Hub sessions.

## Files
- **Backend**: `server/src/controllers/directory.js` (context resolver,
  privacy serializer, all endpoints), `server/src/controllers/directoryAuth.js`
  (magic link, password login, session lifecycle),
  `server/src/middleware/directoryAuth.js` (session middleware + rate
  limiter), `server/src/routes/directory.js` (`verifyDirectoryAccess`).
- **Schema**: `DirectoryMember`, `DirectoryAccount`, `DirectoryAuditLog`,
  `DirectoryLoginToken` in `prisma/schema.prisma`.
  `userId`/`spouseMemberId` uniqueness uses **filtered unique indexes**
  (`WHERE col IS NOT NULL`) — Prisma `@unique` can't express these and an
  unfiltered index breaks multiple NULLs. Don't re-add `@unique` there.
  `DirectoryAccount.memberId`/`email` are required → plain `@unique` is fine.
- **Frontend**: `index.jsx` (merged Browse — card grid + staff Cards/Table
  toggle, multi-select district chips, `?view=table`/`?status=`/`?add=1`
  params, server pagination: Load-more for cards, pager for table),
  `DirectoryDashboard.jsx` (stats + by-district chart + pending queue),
  `Members.jsx` (`MembersTable` component: activate, status/role menus,
  hard-delete for duplicates, portaled row menu), `MemberFormDialog.jsx`
  (add = required duplicate-check step → RHF+zod form; edit = form),
  `MemberDetailDialog.jsx` (details + provenance/verify + audit history for
  staff), `MyProfile.jsx` (self-service + photo upload + password),
  `DirectoryLogin.jsx` / `DirectoryVerify.jsx` / `SaintLayout.jsx`
  (saint-facing shell), `api/directoryApi.js`,
  `store/directoryStore.js` (session + cached `/meta`),
  `utils/memberUtils.js`.
- **Routes**: `/directory/{login,verify}` public; `/directory`,
  `/directory/me` behind `SaintProtectedRoute` (directory session);
  `/hub-admin/directory/{dashboard,browse,me}` behind Hub auth.
- **Tests**: `server/tests/directoryPolicy.test.mjs` (`node --test tests/`
  or `npm test` in `server/`).

## Gotchas
- Role-change matrix and status-per-role lists exist BOTH server-side
  (authoritative) and in `Members.jsx` (`STATUS_OPTIONS`/`ROLE_OPTIONS`) for
  menu rendering — keep them in sync.
- Saint sessions are NOT Hub sessions: `api.js` only attempts Hub token
  refresh when `isAuthenticated` is true, so a saint's 401 doesn't clobber
  Hub auth state.
- `serializeMember` relies on `account` being included in queries for
  `hasAccount` — every member `include` carries `account: { select: { id } }`.
- The 2024 PDF import (`pdf-2024-final` batch): 811 rows, name/phone/district
  only — no email/address/gender/marital status. `W` district = `West` (the
  phonelist sheet's name; renamed by migration `20260926_directory_district_names`).
  Two "Sunny Chen" records are confirmed different people.

## Pending (not yet implemented)
- **CSV import/export** — bulk load path beyond the one-off PDF import.
- **Public directory view** — no public-facing renderer (by design; auth only).
- **Invite flow** — saints with an email get magic links automatically; a
  proper "invite member" button that emails a link is not built yet.
- **Azure Blob photo storage** — uploads currently land in local `uploads/`
  (fine for dev, not durable on App Service).
