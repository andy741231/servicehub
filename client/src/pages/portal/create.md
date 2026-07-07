# Portal App

## Status
**In Progress — Placeholder UI only, backend pending.**

What exists (frontend, placeholder only):
- `PortalDashboard.jsx` — "Coming Soon" placeholder with feature previews and sample chart
- `PortalShell.jsx` — pass-through shell for nested routes (Dashboard is a sidebar drill-down child of the Portal parent)

What's still pending:
- No `index.jsx` browse/landing page
- No `server/src/routes/portal.js` backend route
- No Prisma models for portal configurations in `prisma/schema.prisma`

## Overview
The Portal sub-app will serve as a customizable dashboard and landing page experience for users. It will feature:

### Planned Features
- **Custom Dashboards:** User-configurable dashboard layouts
- **Widget System:** Drag-and-drop widgets for different content types
- **Quick Links:** Personalized quick access to frequently used features
- **Announcements:** Important notices and updates
- **Activity Feed:** Recent activity across the platform
- **User Preferences:** Customizable portal settings

### Use Cases
- Internal employee portal
- Client dashboard
- Partner portal
- Community hub
- Resource center

## Technical Notes
- Will follow the same architecture pattern as other sub-apps
- Database schema to be defined in `prisma/schema.prisma`
- Frontend components in `client/src/pages/portal/`
- Backend routes in `server/src/routes/portal.js`

## Next Steps
1. Define database schema for portal configurations
2. Create widget system architecture
3. Implement dashboard customization
4. Add announcement management
5. Implement user preference system
