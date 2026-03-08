

## Plan: Create In-App Documentation Page with Competitive Analysis

The documentation currently exists as a raw markdown file at `public/documentation.md` but has no route or page to display it. I'll create a beautifully styled, accessible documentation page at `/docs` with a sidebar table of contents, and expand the content to include a competitive analysis section comparing this platform to Credly, Badgr, Accredible, and others.

### What I'll Build

**1. New page: `src/pages/Documentation.tsx`**
A full-featured documentation page with:
- Sticky sidebar with table of contents navigation
- Styled markdown-like content rendered as React components
- Sections covering all existing documentation plus new content:
  - Platform overview and value proposition
  - **"Why Evolve Careers?" section** -- key differentiators
  - **Competitive comparison table** vs Credly, Badgr/Canvas Credentials, Accredible, Open Badge Factory
  - Complete feature list with descriptions
  - Architecture and tech stack
  - Admin dashboard guide
  - Learner dashboard guide
  - Public verification and sharing
  - API and integrations (webhooks, REST API)
  - Security and data integrity (HMAC signatures, RLS, snapshots)
  - Database schema reference
- Mobile-responsive (sidebar collapses to a dropdown)
- Search/filter within the TOC

**2. Route addition in `src/App.tsx`**
- Add `/docs` as a public route

**3. Content additions (new sections not in current docs)**
- "Why Evolve Careers" -- positioning and unique selling points
- Competitive comparison matrix (Credly, Badgr, Accredible, Open Badge Factory) covering pricing model, customization, white-label, API access, data ownership, self-hosting, cryptographic integrity, and Open Badges compliance
- Feature highlights with descriptions of what makes each feature valuable

### Files to Create/Modify
1. **New**: `src/pages/Documentation.tsx` -- Full documentation page component
2. **Edit**: `src/App.tsx` -- Add `/docs` route

