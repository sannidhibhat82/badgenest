

# Evolve Careers Digital Badge Platform

## Overview
A private digital badge platform where admins create/issue badges, learners view/share them, and anyone can verify badges via public URLs.

---

## Phase 1: Backend Setup (Lovable Cloud / Supabase)

### Database Tables
- **Issuers** — name, description, email, website, logo (supports multiple issuers)
- **Badge Classes** — name, description, image, criteria, linked issuer, optional expiry
- **Assertions** (issued badges) — links badge class to learner, issue date, evidence URL, expiry, revoked status
- **User Roles** — separate role table (admin/learner) with RLS security

### Auth & Access Control
- Supabase Auth for login/signup
- Role-based access: admins manage everything, learners see only their own badges
- Row-Level Security policies enforced at database level

---

## Phase 2: Admin Dashboard (`/admin`)

### Badge Management
- Table view of all badge classes with create, edit, delete
- Image upload for badge artwork
- Set criteria and optional expiration period

### Badge Issuance
- Form: select learner + badge class + evidence URL + issue date
- **CSV bulk issuance**: upload CSV to issue badges to multiple learners at once

### Issuer Management
- CRUD for multiple issuers (name, logo, website, description)

### Assertion Management
- List all issued badges with filters
- Revoke/un-revoke toggle with optional reason

### Learner Management
- View all learners and their badges
- Filter by learner name or badge name

### Analytics Section
- Counts: badges issued, revoked, active
- Recent activity log

---

## Phase 3: Learner Dashboard (`/dashboard`)

### My Badges
- Personalized greeting with profile picture
- Grid/list of earned badges showing name, image, date, status (valid/expired/revoked)
- Badge detail modal: full description, criteria, issuer info, download image

### Sharing
- Copy verification link
- Share to LinkedIn (pre-filled URL)
- Social share buttons (LinkedIn, Twitter)

### Account Settings
- Update name and profile picture
- Logout

---

## Phase 4: Public Verification Page (`/verify/:assertionId`)

- Displays badge info, issuer, learner, and issue date
- Shows status: ✅ Valid, ⚠️ Expired, ❌ Revoked
- JSON-LD structured data (Open Badges format) in page head
- Share button for the verification URL

---

## Phase 5: Branding & Polish

- Apply Evolve Careers colors, fonts, logo, and favicon (from uploaded assets)
- Responsive design for mobile and desktop
- Clean, professional UI throughout

---

## Not Included (per spec)
- Email notifications (deferred)
- Cryptographic signatures / baked PNGs
- Full Open Badges spec compliance
- LMS/LTI integrations

