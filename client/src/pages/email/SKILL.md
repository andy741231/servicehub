---
name: service-hub-email-page
description: Guide for building the email campaign scheduler and subscriber management dashboard.
---

# Email Campaigns (`client/src/pages/email`)

## Overview
Coordinates bulk email campaign generation, recipient lists (segmentation), scheduling, and deliverability log statistics.

## Features
- **Campaign Composer:** Rich text/HTML template builder with mail-merge placeholders (e.g. `{{name}}`).
- **Mailing Lists:** CSV upload/parser to populate contacts, list search, and deletion tools.
- **Campaign Analytics:** Logs table showing `sent`, `failed`, or `opened` events.
