# Evolve Careers Digital Badge Platform — Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Schema](#database-schema)
5. [Admin Dashboard](#admin-dashboard)
6. [Learner Dashboard](#learner-dashboard)
7. [Public Pages](#public-pages)
8. [Edge Functions (Backend)](#edge-functions-backend)
9. [API Reference](#api-reference)
10. [Storage](#storage)
11. [Security](#security)
12. [Deployment](#deployment)

---

## 1. Overview

The Evolve Careers Digital Badge Platform is a web application for issuing, managing, and verifying digital credentials (badges). It supports three user types:

- **Admins** — Create badge classes, manage issuers, issue badges to learners, view analytics, and configure integrations.
- **Learners** — View earned badges, share them on social media, and manage their profile.
- **Public visitors** — Verify badge authenticity via public verification URLs.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Lucide icons |
| Backend | Lovable Cloud (Supabase) |
| Auth | Supabase Auth (email/password) |
| Database | PostgreSQL (via Supabase) |
| Serverless | Supabase Edge Functions (Deno) |
| State | React Query (TanStack Query) |
| Routing | React Router v6 |

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React + Vite + Tailwind + shadcn/ui         │
├─────────────────────────────────────────────┤
│              React Router v6                 │
│  /login  /signup  /dashboard  /admin  /verify│
├─────────────────────────────────────────────┤
│           Supabase JS Client                 │
│     Auth · Database · Storage · Functions    │
├─────────────────────────────────────────────┤
│            Lovable Cloud (Supabase)          │
│  PostgreSQL · Auth · Storage · Edge Funcs    │
└─────────────────────────────────────────────┘
```

### Key Files & Directories

| Path | Purpose |
|---|---|
| `src/App.tsx` | Root component, route definitions |
| `src/contexts/AuthContext.tsx` | Auth state provider (user, roles, profile) |
| `src/layouts/AdminLayout.tsx` | Admin shell (sidebar, header) |
| `src/layouts/LearnerLayout.tsx` | Learner shell (header, avatar dropdown) |
| `src/pages/admin/*` | Admin pages (badges, issuers, assertions, etc.) |
| `src/pages/Dashboard.tsx` | Learner badge dashboard |
| `src/pages/Verify.tsx` | Public badge verification |
| `src/pages/PublicProfile.tsx` | Public badge portfolio |
| `src/components/` | Shared components (BadgeCard, ErrorBoundary, etc.) |
| `supabase/functions/` | Edge functions (API, signing, notifications) |

---

## 3. Authentication & Authorization

### Auth Flow

1. **Signup** (`/signup`) — Collects full name, email, password. Creates a Supabase Auth user. A database trigger (`handle_new_user`) automatically creates a `profiles` row and assigns the `learner` role.
2. **Login** (`/login`) — Email/password authentication via Supabase Auth.
3. **Forgot Password** (`/forgot-password`) — Sends a password reset email via Supabase Auth.
4. **Reset Password** (`/reset-password`) — Handles the reset token callback and allows setting a new password.
5. **Session Management** — `AuthContext` listens to `onAuthStateChange` and provides `user`, `session`, `roles`, `isAdmin`, and `profile` to the entire app.

### Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| `admin` | Full CRUD on all entities; access to `/admin/*` routes |
| `learner` | View own badges; update own profile; claim badge invites |

- Roles are stored in a separate `user_roles` table (not on the profile).
- A `has_role(_user_id, _role)` security definer function is used in RLS policies to prevent recursive checks.
- Frontend: `ProtectedRoute` component checks `isAdmin` and redirects unauthorized users.
- Backend: Row-Level Security (RLS) policies enforce access at the database level.

---

## 4. Database Schema

### Tables

#### `profiles`
Stores user profile data (linked to `auth.users` via `user_id`).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid (unique) | References auth.users |
| `full_name` | text | Display name |
| `email` | text | User email |
| `avatar_url` | text | Profile picture URL |
| `created_at` | timestamptz | Account creation |
| `updated_at` | timestamptz | Last update |

#### `user_roles`
Maps users to roles (supports multiple roles per user).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | References auth.users |
| `role` | app_role enum | `admin` or `learner` |

#### `issuers`
Organizations that issue badges.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Issuer name |
| `description` | text | About the issuer |
| `email` | text | Contact email |
| `website` | text | Issuer website URL |
| `logo_url` | text | Logo image URL |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last update |

#### `badge_classes`
Badge templates (definitions).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Badge name |
| `description` | text | Badge description |
| `image_url` | text | Badge artwork URL |
| `criteria` | text | Earning criteria |
| `issuer_id` | uuid (FK) | References `issuers.id` |
| `expiry_days` | integer | Days until expiration (nullable) |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last update |

#### `assertions`
Issued badge instances (a badge awarded to a learner).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `badge_class_id` | uuid (FK) | References `badge_classes.id` |
| `recipient_id` | uuid | References auth.users |
| `issued_at` | timestamptz | Date badge was issued |
| `expires_at` | timestamptz | Expiration date (auto-calculated from `expiry_days`) |
| `evidence_url` | text | Link to supporting evidence |
| `revoked` | boolean | Whether badge has been revoked |
| `revocation_reason` | text | Reason for revocation |
| `signature` | text | HMAC-SHA256 signature |
| `snapshot_json` | jsonb | Frozen data snapshot at signing time |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last update |

#### `badge_invites`
Invitation links for learners to claim badges.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `badge_class_id` | uuid (FK) | References `badge_classes.id` |
| `email` | text | Invitee email |
| `invite_token` | text | Unique claim token |
| `invited_by` | uuid | Admin who sent invite |
| `status` | text | `pending` / `claimed` |
| `claimed_by` | uuid | User who claimed |
| `claimed_at` | timestamptz | Claim timestamp |
| `evidence_url` | text | Evidence URL |
| `created_at` | timestamptz | Created timestamp |

#### `badge_categories`
Categories/tags for organizing badge classes.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Category name |
| `color` | text | Display color (hex) |
| `description` | text | Category description |
| `created_at` | timestamptz | Created timestamp |

#### `badge_class_categories`
Join table linking badge classes to categories (many-to-many).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `badge_class_id` | uuid (FK) | References `badge_classes.id` |
| `category_id` | uuid (FK) | References `badge_categories.id` |

#### `badge_views`
Tracks public views of badge verification pages.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `assertion_id` | uuid (FK) | References `assertions.id` |
| `viewer_hash` | text | Anonymized viewer identifier |
| `viewed_at` | timestamptz | View timestamp |

#### `notifications`
In-app notifications for users.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `user_id` | uuid | Target user |
| `title` | text | Notification title |
| `message` | text | Notification body |
| `read` | boolean | Read status |
| `created_at` | timestamptz | Created timestamp |

#### `tags`
Tags for categorizing learner profiles.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Tag name |
| `color` | text | Display color (hex) |
| `created_at` | timestamptz | Created timestamp |

#### `profile_tags`
Join table linking profiles to tags (many-to-many).

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `profile_user_id` | uuid (FK) | References `profiles.user_id` |
| `tag_id` | uuid (FK) | References `tags.id` |
| `created_at` | timestamptz | Created timestamp |

#### `audit_logs`
Tracks admin actions for accountability.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `actor_id` | uuid | Admin who performed the action |
| `action` | text | Action name (e.g., `badge.issued`) |
| `entity_type` | text | Entity type (e.g., `assertion`) |
| `entity_id` | uuid | Entity ID |
| `details` | jsonb | Additional action details |
| `created_at` | timestamptz | Timestamp |

#### `api_keys`
API keys for programmatic access.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `name` | text | Key name/label |
| `key_hash` | text | SHA-256 hash of the key |
| `key_prefix` | text | First 8 chars for identification |
| `permissions` | jsonb | Array of allowed operations |
| `expires_at` | timestamptz | Key expiration date |
| `revoked` | boolean | Whether key is revoked |
| `last_used_at` | timestamptz | Last API call timestamp |
| `created_by` | uuid | Admin who created the key |
| `created_at` | timestamptz | Created timestamp |

#### `webhooks`
Webhook endpoints for event notifications.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `url` | text | Webhook endpoint URL |
| `secret` | text | HMAC signing secret |
| `events` | text[] | Subscribed events |
| `active` | boolean | Whether webhook is active |
| `failure_count` | integer | Consecutive failures |
| `last_triggered_at` | timestamptz | Last trigger timestamp |
| `created_by` | uuid | Admin who created it |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Last update |

### Database Functions

| Function | Purpose |
|---|---|
| `has_role(_user_id, _role)` | Security definer function to check user roles without RLS recursion |
| `update_updated_at_column()` | Trigger function to auto-update `updated_at` columns |
| `handle_new_user()` | Trigger on `auth.users` insert — creates profile + assigns learner role |

---

## 5. Admin Dashboard

### Routes

All admin routes are under `/admin` and require the `admin` role.

| Route | Page | Description |
|---|---|---|
| `/admin` | Admin Dashboard | KPIs, trend charts, recent activity |
| `/admin/badges` | Badge Classes | CRUD for badge templates with image upload |
| `/admin/issuers` | Issuers | CRUD for issuing organizations |
| `/admin/assertions` | Assertions | Issue badges, CSV bulk import, revoke/delete, bulk sign |
| `/admin/learners` | Learners | View all learners, assign tags, CSV export |
| `/admin/analytics` | Analytics | Charts, filters, PDF export |
| `/admin/audit-log` | Audit Log | Searchable, filterable admin action log |
| `/admin/api-keys` | API Keys | Create/revoke API keys with granular permissions |
| `/admin/webhooks` | Webhooks | Configure webhook endpoints for events |

### Key Admin Features

- **Badge Issuance**: Select learner + badge class, optionally add evidence URL. `expires_at` is auto-calculated from `badge_class.expiry_days`.
- **CSV Bulk Import**: Upload a CSV with columns `email, badge_class_id, evidence_url` to issue badges in bulk.
- **Bulk Signing**: "Sign All" button signs all unsigned assertions with HMAC-SHA256 signatures.
- **Badge Invites**: Generate unique invite links that learners can use to claim badges.
- **Learner Tags**: Create tags and assign them to learner profiles for organization.
- **Analytics PDF Export**: Export analytics data as a PDF report.

---

## 6. Learner Dashboard

### Routes

| Route | Page | Description |
|---|---|---|
| `/dashboard` | My Badges | Grid/list of earned badges with search & filters |
| `/dashboard/settings` | Settings | Update name, avatar, change password |
| `/profile/:userId` | Public Profile | Badge portfolio (also accessible publicly) |

### Key Learner Features

- **Badge Grid/List View**: Toggle between grid and list layouts.
- **Search & Filter**: Search by badge name; filter by status (all/active/expired/revoked).
- **Badge Detail Modal**: View full badge info, criteria, issuer details, download image.
- **Share**: Copy verification link, share to LinkedIn/Twitter.
- **Notifications**: Bell icon with unread count; mark as read.
- **Profile Settings**: Update display name, upload avatar, change password.

---

## 7. Public Pages

### Badge Verification (`/verify/:assertionId`)

Publicly accessible page that displays:

- Badge image, name, and description
- Issuer information
- Recipient name
- Issue date and expiration status
- **Status indicator**: ✅ Valid, ⚠️ Expired, ❌ Revoked
- **Signature verification**: Shows "Signature verified" if HMAC signature is present
- **JSON-LD metadata**: Open Badges format structured data in page `<head>`
- **View counter**: Tracks and displays badge view count
- **Share/Download**: Copy link, download JSON assertion

### Public Profile (`/profile/:userId`)

Displays a learner's badge portfolio:

- Avatar and name
- Stats (active badges, unique issuers, total views)
- Grid of earned badges (non-revoked) with links to verification pages

### Badge Claim (`/claim/:token`)

Allows learners to claim a badge invite:

- Validates invite token
- Shows badge preview
- Authenticated users can click "Claim Badge" to create an assertion
- Unauthenticated users see login/signup links

---

## 8. Edge Functions (Backend)

### `public-api`
**Path**: `supabase/functions/public-api/index.ts`
**Auth**: API key via `x-api-key` header (no JWT required)

REST API for programmatic badge management. See [API Reference](#api-reference) below.

### `sign-assertion`
**Path**: `supabase/functions/sign-assertion/index.ts`
**Auth**: No JWT required (called internally)

Signs a single assertion with HMAC-SHA256:
1. Fetches assertion + badge class + issuer + recipient data
2. Builds a canonical snapshot (sorted JSON keys)
3. Signs with `SUPABASE_SERVICE_ROLE_KEY` as HMAC secret
4. Stores `signature` and `snapshot_json` on the assertion

### `bulk-sign-assertions`
**Path**: `supabase/functions/bulk-sign-assertions/index.ts`
**Auth**: No JWT required (called from admin UI)

Signs all unsigned assertions in batch:
1. Fetches all assertions where `signature IS NULL`
2. Builds snapshots and signs each one
3. Returns `{ signed, total, errors }` summary

### `send-badge-notification`
**Path**: `supabase/functions/send-badge-notification/index.ts`

Sends email notifications when badges are issued (implementation may vary).

---

## 9. API Reference

### Authentication

All API requests require an `x-api-key` header with a valid API key created from the admin dashboard.

### Endpoints

#### List Badge Classes
```
GET /public-api/badges
Permission: badge.list
Response: { badges: BadgeClass[] }
```

#### List Assertions
```
GET /public-api/assertions?limit=50&offset=0
Permission: assertion.list
Response: { assertions: Assertion[] }
```

#### Issue a Badge
```
POST /public-api/assertions
Permission: badge.issue
Body: {
  badge_class_id: string,
  recipient_id: string,
  evidence_url?: string,
  issued_at?: string,
  expires_at?: string
}
Response: { assertion: Assertion }
```

#### Revoke a Badge
```
POST /public-api/assertions/:id/revoke
Permission: badge.revoke
Body: { reason?: string }
Response: { assertion: Assertion }
```

### Webhook Events

When webhooks are configured, the API dispatches events:

| Event | Trigger |
|---|---|
| `badge.issued` | New assertion created via API |
| `badge.revoked` | Assertion revoked via API |

Webhook payloads are signed with HMAC-SHA256 using the webhook's secret, sent in the `X-Webhook-Signature` header.

---

## 10. Storage

Three public storage buckets:

| Bucket | Purpose | Max Size |
|---|---|---|
| `badge-images` | Badge class artwork | — |
| `issuer-logos` | Issuer organization logos | — |
| `avatars` | User profile pictures | — |

All buckets are **public** (readable without auth). Uploads require authentication.

---

## 11. Security

### Row-Level Security (RLS)

Every table has RLS enabled with policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Anyone | Own user | Own user | ❌ |
| `user_roles` | Own + Admin | Admin | Admin | Admin |
| `issuers` | Anyone | Admin | Admin | Admin |
| `badge_classes` | Anyone | Admin | Admin | Admin |
| `assertions` | Anyone | Admin | Admin | Admin |
| `badge_invites` | Anyone | Admin | Authenticated | Admin |
| `badge_views` | Anyone | Anyone | ❌ | ❌ |
| `notifications` | Own + Admin | Admin | Own + Admin | Admin |
| `audit_logs` | Admin | Admin | ❌ | ❌ |
| `api_keys` | Admin | Admin | Admin | Admin |
| `webhooks` | Admin | Admin | Admin | Admin |
| `tags` | Anyone | Admin | Admin | Admin |
| `badge_categories` | Anyone | Admin | Admin | Admin |

### Signature Verification

- Assertions are signed using **HMAC-SHA256** with the service role key
- A frozen `snapshot_json` captures badge/issuer/recipient data at signing time
- The verification page shows "Signature verified" when a signature exists
- This ensures badge data integrity even if the original records are later modified

### Error Handling

- **ErrorBoundary** component wraps the entire app to catch runtime crashes gracefully
- **Protected Routes** enforce role-based access on the frontend
- **RLS policies** enforce access control at the database level

---

## 12. Deployment

### Frontend
- Built with Vite (`npm run build`)
- Deployed via Lovable's "Publish" button
- Frontend changes require clicking "Update" in the publish dialog

### Backend
- Edge functions deploy automatically on save
- Database migrations are managed through Lovable Cloud
- No manual deployment steps required for backend changes

### Environment Variables (Auto-configured)
| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Routes Summary

| Route | Access | Description |
|---|---|---|
| `/` | Public | Redirects to dashboard or login |
| `/login` | Public | Login page |
| `/signup` | Public | Registration page |
| `/forgot-password` | Public | Password reset request |
| `/reset-password` | Public | Password reset confirmation |
| `/dashboard` | Learner | Badge dashboard |
| `/dashboard/settings` | Learner | Profile settings |
| `/admin` | Admin | Admin dashboard |
| `/admin/badges` | Admin | Badge class management |
| `/admin/issuers` | Admin | Issuer management |
| `/admin/assertions` | Admin | Assertion management |
| `/admin/learners` | Admin | Learner management |
| `/admin/analytics` | Admin | Analytics & reporting |
| `/admin/audit-log` | Admin | Audit trail |
| `/admin/api-keys` | Admin | API key management |
| `/admin/webhooks` | Admin | Webhook configuration |
| `/verify/:assertionId` | Public | Badge verification |
| `/profile/:userId` | Public | Badge portfolio |
| `/claim/:token` | Public | Badge claim |

---

*Generated for the Evolve Careers Digital Badge Platform*
*Last updated: March 2026*
