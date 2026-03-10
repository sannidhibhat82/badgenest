

# Security Scan Results & Remediation Plan

The scan found **4 findings** — 1 critical, 3 warnings. Here is a summary and the proposed fixes.

---

## Findings

### 1. CRITICAL — All user emails readable by any authenticated user
The `profiles` table SELECT policy uses `USING (true)` for authenticated users, exposing every user's email and name to any logged-in user.

**Fix:** Replace the broad SELECT policy with two policies:
- Users can read their own full profile: `USING (auth.uid() = user_id)`
- Admins can read all profiles: `USING (has_role(auth.uid(), 'admin'))`
- A limited public profile policy for features that need it (e.g., badge verification showing names): create a database view or RPC that returns only `user_id, full_name, avatar_url` without email.

**Impact:** The admin pages (LearnersPage, AssertionsPage, AuditLogPage) query all profiles — these work because admins have the admin policy. The learner Dashboard fetches only the user's own badges and doesn't need other profiles. The `PublicProfile` page already uses the `get_public_profile` RPC (security definer, no email exposed). Need to audit any other client-side `profiles` queries.

### 2. WARN — Assertions publicly readable (including snapshot_json with potential PII)
The `assertions` SELECT policy allows anonymous reads. This is intentional for public badge verification, but `snapshot_json` may contain recipient email.

**Fix:** Either:
- Strip PII from `snapshot_json` at sign time (remove email from the snapshot), or
- Replace the public SELECT policy with a narrower one that excludes `snapshot_json` for anonymous users (requires a view or RPC approach since Postgres RLS is row-level, not column-level).

Recommended: Create a `public_assertions` view that omits `snapshot_json` and `recipient_id`, and direct public verification through the existing Verify page RPC pattern.

### 3. WARN — RLS policy always true (badge_views INSERT)
`badge_views` has `WITH CHECK (true)` on INSERT. This is intentional (anonymous view tracking), but should be noted.

**Fix:** Low priority. Optionally add rate-limiting or a check that `assertion_id` exists to prevent junk inserts.

### 4. WARN — Leaked password protection disabled
Supabase auth does not check passwords against known breach databases.

**Fix:** Enable leaked password protection via auth configuration.

---

## Implementation Steps

1. **Drop and recreate `profiles` SELECT policy** — split into self-read + admin-read
2. **Audit all client-side `profiles` queries** — ensure non-admin code only reads own profile or uses RPCs
3. **Sanitize `snapshot_json`** — remove `recipient_email` from the sign-assertion edge function snapshot
4. **Enable leaked password protection** via auth config tool
5. **Update the MigrationGuide page** with the security hardening notes

### Files to modify:
- **Database migration** — new RLS policies for `profiles`
- `supabase/functions/sign-assertion/index.ts` — remove email from snapshot
- `supabase/functions/bulk-sign-assertions/index.ts` — same
- Potentially `src/pages/admin/LearnersPage.tsx`, `AssertionsPage.tsx`, `AuditLogPage.tsx` — verify they still work with admin-only policy (they should, since they require admin auth)

