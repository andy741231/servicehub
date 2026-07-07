---
name: service-hub-auth-page
description: "[auth] Guide for developing and maintaining the Login and Register page interfaces."
---

# Authentication Pages (`client/src/pages/auth`)

## Overview
Handles user authentication flows on the client side, including:
- User Login (JWT acquisition via httpOnly cookie)
- User Registration (UI exists but is **not yet functional** — see below)

## Architecture & State
- **State Store:** Uses `authStore` (Zustand) to manage `user` (decoded JWT payload), `isAuthenticated`, and loading states. The store currently exposes `checkAuth`, `login`, `logout`, and `dismissLoggedOutMessage` — there is **no `register` action** yet.
- **CSRF:** The backend relies on SameSite cookie configuration for CSRF protection. The client does **not** auto-fetch a CSRF token on page load, and `utils/api.js` does **not** attach any CSRF header to axios requests. (A CSRF endpoint may exist on the backend, but the client does not currently wire it up.)
- **Routing:** After successful login, users are redirected to `/hub-admin/welcome` (the post-login landing page) if they have at least one accessible sub-app. If already authenticated, redirect away from `/login` to the welcome page. The redirect logic lives in `getPostLoginPath()` in `Login.jsx`. Register redirects to `/hub-admin/welcome` as well.

## Key Files
- `Login.jsx` - Contains the username/password form with validations. (Implemented and routed.)
- `Register.jsx` - Sign-up form (name, email, password). **Not yet functional:** it calls `useAuthStore((state) => state.register)`, but no `register` action exists in `authStore.js`, no `/auth/register` endpoint exists on the backend (`server/src/routes/auth.js` only defines `login`, `logout`, `refresh`, `me`), and the component is not routed in `App.jsx`. Treat registration as **planned / not-yet-implemented**.
