---
name: service-hub-directory-page
description: "[directory] Guide for building the Directory sub-app."
---

# Directory (`client/src/pages/directory`)

## Overview
The Directory sub-app has a working **frontend UI** that lets users browse an
organization's team members. It is currently driven entirely by **mock data** — there
is no backend route, no database models, and no API integration yet.

## Current State (built)
- **DirectoryShell.jsx** — tab wrapper that registers TopBar tabs (Dashboard, Browse)
  and renders child routes via `<Outlet />`.
- **DirectoryDashboard.jsx** — bento-style dashboard with stat cards (team members,
  departments, searchable), a quick-actions panel, a recent-members list, and a bar
  chart of members by department. All stats are derived from the in-file mock array.
- **index.jsx** (Browse page) — searchable, filterable grid of team member cards
  (avatar, name, title, department, email, phone, location, start date). Search
  matches name/title/email; department filter uses a chip toggle. Data comes from an
  in-file `MOCK_DIRECTORY` array (8 entries).
- **Routing** — wired in `client/src/App.jsx` under
  `/hub-admin/directory/{dashboard,browse}` inside the protected `AppShell`.

## Pending (not yet implemented)
- **Backend route** — no `server/src/routes/directory.js`; nothing registered in
  `server/src/routes/index.js`.
- **Database models** — no Directory-related models in `prisma/schema.prisma`.
- **API integration** — pages read from local mock arrays, not from `api.js`.
- **Add/edit member flow** — the dashboard "Add Member" quick action is a placeholder
  ("Coming soon").
- **Public directory view** — no public-facing renderer yet.
