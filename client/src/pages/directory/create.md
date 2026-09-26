# Directory App

## Status
**Full stack implemented** — church phone list per `directory-startup.md`.

- `server/src/routes/directory.js` + `controllers/directory.js` — CRUD, status lifecycle, role matrix, district scoping, privacy masking, audit log, photo upload, duplicate check
- `DirectoryMember` + `DirectoryAuditLog` Prisma models (filtered unique indexes on userId/spouseMemberId — see schema comment)
- `DirectoryDashboard.jsx` — real stats (active saints, districts, pending queue), by-district chart
- `index.jsx` — merged Browse+Members: masked card grid for all; staff get Cards/Table toggle, status filter, Add Member (`/hub-admin/directory/members` redirects here with `?view=table`)
- `Members.jsx` — `MembersTable` component (activate, status/role changes, hard-delete duplicates, portaled row menu)
- `MemberFormDialog.jsx` — add with duplicate-check step / edit
- `MemberDetailDialog.jsx` — member details + audit history (staff)
- `MyProfile.jsx` — saint self-service (contact info, privacy toggles, photo, set-password card)
- `DirectoryShell.jsx` — pass-through shell

### Saint-facing auth (`/directory`, outside hub-admin)
- `controllers/directoryAuth.js` — magic link (request/verify, 30-min one-time hashed tokens in `DirectoryLoginToken`, 60s request cooldown, atomic consume, IP rate limits), password login, set-password endpoint
- `middleware/directoryAuth.js` — `verifyDirectoryAccess`: accepts `directoryToken` (directory sessions) or `token` (Hub sessions); resolves `req.directoryCtx`; rejects inactive members
- `DirectoryAccount` model — dedicated directory identity (memberId, email, optional passwordHash, sessionVersion). Status changes bump sessionVersion → instant revocation. Directory JWTs never authorize Hub routes
- `DirectoryLogin.jsx` — `/directory/login`, magic link primary + password toggle
- `DirectoryVerify.jsx` — `/directory/verify?token=` consumes links
- `SaintLayout.jsx` — minimal shell (Browse / My Profile / sign out; staff manage via the in-page Cards/Table toggle)
- Member `email` doubles as login email — staff/self email edits sync `DirectoryAccount.email`

Still pending: CSV import/export, public renderer (intentionally none), Azure Blob photo storage.

## Overview
The Directory sub-app will provide a searchable, filterable directory of items, people, or resources. It will feature:

### Planned Features
- **Directory Management:** Create and manage directory entries
- **Search & Filter:** Full-text search with advanced filtering options
- **Categories & Tags:** Organize entries with categories and tags
- **Public/Private Directories:** Control access to directory content
- **Export Options:** CSV/Excel export of directory data
- **Custom Fields:** Flexible field configuration for different directory types

### Use Cases
- Employee directory
- Resource library
- Service provider listing
- Member directory
- Vendor catalog

## Technical Notes
- Will follow the same architecture pattern as other sub-apps
- Database schema to be defined in `prisma/schema.prisma`
- Frontend components in `client/src/pages/directory/`
- Backend routes in `server/src/routes/directory.js`

## Next Steps
1. Define database schema for directory entries
2. Create basic CRUD interface
3. Implement search and filtering
4. Add category/tag management
5. Implement access controls
