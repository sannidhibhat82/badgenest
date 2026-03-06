

## Admin Dashboard Audit: Missing Launch-Critical Features

After reviewing all admin pages, here are the key gaps that would matter for a production launch:

---

### 1. CSV Bulk Import by Email (Currently Broken)
The CSV import on the Assertions page explicitly throws an error: *"CSV with 'email' column is not yet supported."* Since the `profiles` table now has an `email` column, this can be fixed to look up learners by email -- which is far more practical than requiring raw user IDs.

### 2. Mobile Navigation for Admin
The admin sidebar is `hidden lg:flex` with no hamburger menu on smaller screens. On mobile/tablet, there is no way to navigate between admin pages.

### 3. Search and Pagination on Assertions Page
The assertions table has a badge filter dropdown but no text search (by learner name/email). There is also no pagination -- if you issue hundreds of badges, the table loads everything at once with no way to page through.

### 4. Confirmation and Reason for Revocation
Revoking a badge is currently a simple toggle switch with no confirmation dialog and a hardcoded reason ("Revoked by admin"). Admins should be prompted for a reason before revoking.

### 5. Admin Dashboard is Too Bare
The main `/admin` page shows only 4 stat cards with no recent activity, no quick actions, and no visual charts. It should include recent issuances, a quick-issue shortcut, and trend indicators.

### 6. Issue Badge with Email Support
The "Issue Badge" dialog requires selecting a learner from a dropdown. There is no way to issue a badge to someone by typing their email -- which is how most admins would work.

### 7. Delete Assertion Capability
There is no way to delete an assertion -- only revoke. For data cleanup or mistakes, admins need a delete option.

### 8. Analytics Page Lacks Charts and Meaningful Data
The analytics page shows the same KPI cards as the dashboard and a "Recent Activity" list that only says "Badge issued" with no learner/badge name. No charts, no trends, no time-based filtering.

### 9. Pagination on Learners Page
The learners table loads all profiles at once with no pagination. Will not scale past a few hundred learners.

### 10. No Badge Issuance Count on Badges Page
The badges table shows image, name, issuer, and expiry but not **how many times** each badge has been issued -- a critical metric for admins.

---

### Recommended Priority for Launch

| Priority | Feature | Impact |
|----------|---------|--------|
| High | Fix CSV import to support email lookup | Core workflow |
| High | Mobile admin navigation (hamburger menu) | Usability |
| High | Revocation confirmation with reason input | Data integrity |
| High | Search + pagination on Assertions | Scalability |
| Medium | Richer admin dashboard (recent activity, charts) | First impression |
| Medium | Analytics with actual charts and badge/learner names | Decision-making |
| Medium | Issue badge by email input | Workflow efficiency |
| Medium | Pagination on Learners page | Scalability |
| Low | Delete assertion option | Edge case cleanup |
| Low | Badge issuance count on Badges table | Nice-to-have metric |

Would you like me to implement all of these, or would you prefer to pick specific ones to tackle first?

