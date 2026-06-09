# Admin and User Account Plan

## Current state

The project is a static HTML/CSS/JavaScript site with Vercel serverless API routes.

Authentication now uses Clerk on the frontend and Vercel API routes for backend role checks. The browser signs in through ClerkJS, then sends a Clerk session token to `/api/auth/me`. The backend verifies that token with Clerk before returning the user role.

Configured roles:

- `customer`
- `admin`
- `super_admin`

Super admin email:

- `oliyad@thelivingstonefoundation.com`

## Environment variables

Set these in Vercel before using auth in production:

- `CLERK_PUBLISHABLE_KEY`: Clerk publishable key for frontend sign-in
- `CLERK_SECRET_KEY`: Clerk secret key for backend token verification and user lookup
- `CLERK_FRONTEND_API_URL`: optional Clerk frontend API host override from the JavaScript quick-copy snippet
- `CLERK_AUTHORIZED_PARTIES`: optional comma-separated allowed origins for token verification
- `ADMIN_EMAILS`: optional comma-separated admin email allowlist, excluding the super admin email

Local setup:

- `npx clerk auth login`
- `npx clerk link --app app_3EsL2eeMT6M9fZPFMjxjKxia1qE`
- `npx clerk env pull --file .env.development.local`
- `npm run dev`

The local dev script uses Vercel dev because the account and admin pages call `/api/auth/*` serverless functions. `npm run dev:static` is still available for static-only page checks.

Role assignment:

- `oliyad@thelivingstonefoundation.com` is always treated as `super_admin` server-side.
- Other users can be assigned roles with Clerk `publicMetadata.role` or `privateMetadata.role`.
- Valid role values are `customer`, `admin`, and `super_admin`.
- If no role metadata is present, users default to `customer`.

## Recommended implementation

For a broader production system, keep Clerk for identity and move operational data behind a database-backed backend app while preserving the current visual design.

Recommended stack:

- Next.js App Router for pages, API routes, and server-rendered protected views
- Clerk for authentication
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
