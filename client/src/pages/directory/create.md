# Directory App

## Status
**In Progress — Frontend UI complete (mock data), backend pending.**

What's built (frontend, all using mock data):
- `DirectoryDashboard.jsx` — bento-style dashboard with stats, recent members, and a departments chart
- `index.jsx` — browse page with full-text search and department filter
- `DirectoryShell.jsx` — shell with Dashboard and Browse tabs

What's still pending:
- No `server/src/routes/directory.js` backend route
- No Prisma models for directory entries in `prisma/schema.prisma`
- No API integration — all data is hardcoded mock data

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
