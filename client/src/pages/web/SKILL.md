---
name: service-hub-web-page
description: Guide for creating the Web Builder block-based page editor and Public Site dynamic renderer.
---

# Web Builder & CMS Platform (`client/src/pages/web`)

## Overview
A dynamic Content Management System allowing administrators to build the public-facing website visually. The "Web Builder" component provides an interface to edit content and styling, while the public frontend dynamically fetches and renders these settings.

## Technical Architecture
1. **CMS API (`server/src/controllers/web.js`)**
   - Exposes RESTful endpoints (`GET /api/web/:slug` and `PUT /api/web/:slug`) to interact with `WebPage` and `WebBlock` Prisma models.
   - Includes auto-bootstrap capabilities for new pages.
   - Saves updates using atomic Prisma transactions.

2. **Admin Web Builder (`client/src/pages/web/index.jsx`)**
   - **Template Selection:** Users can switch between predefined themes (Modern, Classic, Minimal).
   - **Block Editor:** Users can add, edit, reorder, and delete sections of type:
     - `Hero` (title, subtitle)
     - `Text` (multiline content)
   - Synchronizes data back to the database in real-time when "Save Changes" is triggered.

3. **Public Dynamic Renderer (`client/src/pages/public/Home.jsx`)**
   - Fetches configuration from the API on mount.
   - Conditionally injects CSS design systems (fonts, colors, layouts) based on the active template.
   - Iterates through the block array to render actual user content dynamically.
