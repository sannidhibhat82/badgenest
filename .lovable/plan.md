

## Production Readiness Assessment

Your app is functionally complete but has **2 critical security issues** and a few smaller items to address before going live.

---

### Critical Security Fixes (Must Fix)

**1. Badge invite tokens and emails are publicly exposed**
The `badge_invites` table SELECT policy uses `USING (true)` with no filter, meaning anyone (even unauthenticated) can read every invite token and email. Additionally, any authenticated user can claim any invite via the UPDATE policy. This means:
- An attacker can steal invite tokens and claim badges meant for others
- All invited email addresses are leaked

**Fix:** Tighten RLS policies:
- SELECT: restrict to admin OR where `email` matches the authenticated user's email, or require token lookup at the row level
- UPDATE: restrict to rows where the invite email matches the claiming user's email

**2. User emails in profiles table are publicly readable**
The `profiles` table has `USING (true)` on SELECT, exposing every user's email to anonymous visitors. This is a privacy/GDPR concern.

**Fix:** Either:
- Restrict SELECT to authenticated users only, OR
- Create a public-safe view that excludes the email column

---

### Security Warnings (Should Fix)

**3. Leaked password protection is disabled**
Enable leaked password protection in auth settings to prevent users from signing up with known compromised passwords.

**4. Issuer emails publicly readable**
The `issuers` table exposes contact emails publicly. Lower risk since these are organizational emails, but worth restricting to authenticated users if not intended for public display.

---

### Other Production Considerations

**5. Email verification not enforced**
Users can access the dashboard without verifying their email. The `ProtectedRoute` only checks if `user` exists, not email confirmation status.

**6. No landing page**
The `/` route redirects straight to login. If the published URL is shared externally, visitors see a login form with no context about the platform. Consider adding a simple landing page.

**7. Rate limiting on public endpoints**
The public API edge function and verification page have no rate limiting. The `badge_views` insert could be spammed despite the localStorage throttle (which is trivially bypassed).

---

### Summary

| Item | Severity | Effort |
|---|---|---|
| Fix badge_invites RLS (tokens/emails exposed) | Critical | Small (2 SQL migrations) |
| Fix profiles SELECT policy (emails exposed) | Critical | Small (1 SQL migration) |
| Enable leaked password protection | Warning | Trivial (auth config) |
| Restrict issuer emails | Warning | Small (1 SQL migration) |
| Enforce email verification | Recommended | Medium |
| Add landing page | Nice to have | Medium |
| Rate limiting | Nice to have | Medium |

I recommend fixing items 1-4 before going to production. Items 5-7 can follow shortly after launch.

