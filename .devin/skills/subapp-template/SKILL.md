---
name: service-hub-subapp-template
description: "[subapp-template] Boilerplate walkthrough and checkpoints to follow when copying this folder for a new sub-app."
---

# New Sub-App Template (`client/src/pages/_template`)

> **Note:** A `_template/` folder is planned at `client/src/pages/_template` to hold
> copyable boilerplate, but it does **not** exist yet (the folder is empty — there are
> no scaffold files to copy). Until it is populated, scaffold a new sub-app manually
> using the steps below.

## How to scaffold a new sub-app

Every sub-app is registered in **two places** and wired through the frontend router and
backend route registry. Follow these steps in order (see AGENT.md "App Registry"):

1. **Add the app ID** to the `APP_IDS` object in `shared/constants.js`
   (e.g. `INVOICES: 'invoices'`).
2. **Register the app** in the `APPS` array in `client/src/layouts/AppShell.jsx`.
   Each entry needs: `id` (the APP_IDS key), `label`, `path` (like
   `/hub-admin/<app>/dashboard`), `Icon` (a lucide-react icon), and a `children`
   array listing the sub-app's sections as drill-down sidebar items (each child
   has `label`, `path`, and `Icon`). Sidebar nav, drill-down children, and
   permission guards all derive from this array.
3. **Create the page folder** in `client/src/pages/<app-id>/`. At minimum, scaffold:
   - `<App>Shell.jsx` — pass-through wrapper that renders an `<Outlet />` (and
     optionally registers TopBar actions via `useTopBar().registerActions`).
     Section navigation lives in the sidebar as drill-down children, not in the
     TopBar. See `DirectoryShell.jsx` for a reference pattern.
   - `<App>Dashboard.jsx` — the dashboard landing page.
   - `index.jsx` — additional pages (browse, list, etc.) as needed.
4. **Add the frontend routes** in `client/src/App.jsx`. Import your shell and page
   components, then nest them under the protected `AppShell` route, e.g.:
   ```jsx
   <Route path="<app-id>" element={<AppShell />}>
     <Route index element={<Navigate to="/hub-admin/<app-id>/dashboard" replace />} />
     <Route path="dashboard" element={<AppDashboard />} />
     {/* ...other pages... */}
   </Route>
   ```
5. **Add the backend route** in `server/src/routes/` (e.g. `<app>.js`) and register it
   in `server/src/routes/index.js`:
   ```js
   import appRoutes from './<app>.js';
   router.use('/<app>', appRoutes);
   ```
   Apply `verifyToken` and `requireAppAccess(APP_IDS.<APP>)` middleware on protected
   endpoints.

## Planned Scaffold Files (not yet present)
When the `_template/` folder is populated, it is expected to contain:
- `index.jsx` - Standard entry point wrapper checking permission access.
- `Dashboard.jsx` - Boilerplate workspace layout.
