---
name: service-hub-auth-page
description: Guide for developing and maintaining the Login and Register page interfaces.
---

# Authentication Pages (`client/src/pages/auth`)

## Overview
Handles user authentication flows on the client side, including:
- User Login (JWT acquisition via httpOnly cookie)
- User Registration
- CSRF Token handshake on initialization

## Architecture & State
- **State Store:** Uses `authStore` (Zustand) to manage `user` (decoded JWT payload), `isAuthenticated`, and loading states.
- **CSRF Token:** Fetched upon page load and attached to axios headers for secure form submissions.
- **Routing:** Directs users to `/` after successful login. If already authenticated, redirect away from `/login` / `/register` to `/`.

## Key Files to Create
- `Login.jsx` - Contains the username/password form with validations.
- `Register.jsx` - Regulates sign-up fields (name, email, password) with password strength checking.
