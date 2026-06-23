---
name: service-hub-admin-page
description: Guide for building and maintaining the User Management and App Permissions toggle board.
---

# User Management Board (`client/src/pages/admin`)

## Overview
Allows administrators to view, modify, activate/deactivate users, and toggle access rights for the registered sub-apps.

## Features
- **User CRUD Table:** Detailed list of users showing name, email avatar initials, status badge (Active/Inactive), role tags, and app permissions checklist.
- **Modals:**
  - **Create User:** Fields for full name, email, password, role select buttons, and app permissions checklist.
  - **Edit User:** Fields for full name, email (disabled), active status toggle, role select buttons, and app permissions checklist.
  - **Delete User:** Centered warning confirmation modal (deleting `admin@example.com` is disabled for safety).
- **App Permissions Matrix:** Live checkboxes allowing admins to toggle access to sub-apps (e.g., Homepage CMS, Form Builder, Email Sender) directly within the table row or via the detail modals.
- **Role Assignment:** Easy role toggles supporting `admin`, `editor`, and `viewer` roles.

## Technical Architecture

### Component State
- `users`: Array containing the user objects fetched from the database.
- `loading`: Boolean state for loading spinners.
- `isFormOpen`: Controls visibility of the Create/Edit modal.
- `isDeleteOpen`: Controls visibility of the delete warning modal.
- `selectedUser`: Stores the user object currently being edited or targeted for deletion.
- `formData`: Object managing inputs for name, email, password, isActive, roles, and permissions.

### API Endpoints Utilized
- `GET /users` - Retrieve all users with nested roles and permissions.
- `POST /users` - Create a new user with initial roles and permissions.
- `PUT /users/:id` - Update name, status, roles, and permissions.
- `DELETE /users/:id` - Remove user account and associated permissions/roles mapping.

## Security & Access Control
- Access is strictly guarded by the backend permissions middleware (`requireRole('admin')`) and the client-side router.
- Password hashing is enforced on the backend during creation using `bcrypt`.
- Deletion is disabled in the UI for the default root admin (`admin@example.com`) to prevent accidental lockouts.

## Styling (Tailwind CSS v4)
- **Modals:** Built with backdrop-blur support (`backdrop-blur-sm bg-black/50`) and scale animations (`animate-in fade-in zoom-in-95`).
- **Icons:** Powered by `lucide-react` (e.g., `Plus`, `Edit2`, `Trash2`, `Shield`, `User`, `Mail`, `Lock`, `Check`).
- **Colors:** Defined in theme variables in CSS, compatible with Tailwind v4 `@theme` configuration.

