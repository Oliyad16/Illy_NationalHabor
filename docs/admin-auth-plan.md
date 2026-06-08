# Admin and User Account Plan

## Current state

The project is a static HTML/CSS/JavaScript site. It has no backend runtime, database, session storage, password handling, or protected route layer.

Because of that, a real admin dashboard and real user accounts cannot be made secure inside the current static-only architecture. Any client-side-only login would be cosmetic and bypassable.

## Recommended implementation

Move the operational pieces behind a backend app while keeping the current visual design.

Recommended stack:

- Next.js App Router for pages, API routes, and server-rendered protected views
- Clerk or Auth0 for authentication
- Role-based access control with at least `customer`, `staff`, and `admin`
- Postgres for accounts, order drafts, rewards, gift card records, and audit history
- Toast API integration server-side only

## User account features

- Sign up / sign in
- Profile: name, phone, email
- Saved pickup preferences
- Order history, sourced from local app records and later Toast order IDs
- Rewards balance and tier status
- Gift card balance lookup once a real gift card provider or Toast-supported flow is confirmed

## Admin dashboard features

- Menu management view
- Toast sync status
- Order handoff status
- Rewards customer list
- Gift card requests
- Store hours/contact settings
- Staff/admin user management

## Security requirements

- Never store passwords in this repo or in browser localStorage
- Never expose Toast API credentials in client-side JavaScript
- Protect admin routes server-side
- Log admin changes with user ID and timestamp
- Keep payment processing in Toast unless a PCI-compliant payment flow is approved

## Suggested build sequence

1. Convert the static branch pages into a Next.js app without changing the visual design.
2. Add authentication and protected account/admin layouts.
3. Add a database schema for users, roles, rewards, and order handoff records.
4. Add admin dashboard pages with real role checks.
5. Add Toast menu sync using Toast Menus API.
6. Add Toast order handoff using Toast Orders API after credentials and scopes are approved.
