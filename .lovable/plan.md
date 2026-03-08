

## Optimization Plan for Evolve Careers Platform

### 1. Lazy-load route components (Code splitting)

Every page is eagerly imported in `App.tsx`. This means the entire admin panel, analytics charts (Recharts), PDF libraries, and documentation page all load upfront even for learners who only need the dashboard.

**Fix:** Use `React.lazy()` + `Suspense` for all route components. This alone will significantly reduce initial bundle size.

**Files:** `src/App.tsx`

---

### 2. Eliminate waterfall queries (N+1 patterns)

Several pages make sequential queries that could be parallelized or combined:

- **Dashboard.tsx** (lines 43-69): Fetches assertions, then badge_classes, then issuers, then badge_views sequentially. The last 3 can run in parallel via `Promise.all`.
- **AssertionsPage.tsx** (lines 49-67): Fetches assertions then profiles sequentially. These can be parallelized.
- **Verify.tsx** (lines 27-82): Makes up to 5 sequential queries (assertion, badge, issuer, recipient, views). The badge+issuer+recipient+views queries can all be parallelized after the initial assertion fetch.
- **CSV bulk import** (lines 170-225): Issues assertions one-by-one in a loop with individual sign + notify calls. Should batch inserts and use the existing `bulk-sign-assertions` function.

**Files:** `src/pages/Dashboard.tsx`, `src/pages/admin/AssertionsPage.tsx`, `src/pages/Verify.tsx`

---

### 3. Deduplicate repeated queries across pages

The `AuthContext` fetches `user_roles` and `profiles` on every auth state change. The network logs show these same queries firing 4-6 times on navigation. This is because:

- `onAuthStateChange` and `getSession` both call `fetchUserData`, causing double-fetch on mount.
- No deduplication — each fires independently.

**Fix:** Use a flag to prevent double-fetch. Use React Query for auth data to get automatic caching/deduplication.

**Files:** `src/contexts/AuthContext.tsx`

---

### 4. Add `staleTime` to React Query configs

Currently all queries use default `staleTime: 0`, meaning every component mount triggers a refetch. For data that changes infrequently (badge classes, issuers, tags, categories), set `staleTime: 5 * 60 * 1000` (5 minutes).

**Files:** `src/App.tsx` (QueryClient defaults), or per-query in individual pages

---

### 5. Prevent badge_views spam on Verify page

Every visit to `/verify/:id` inserts a `badge_views` row with no deduplication. A bot or refresh loop could fill the table. 

**Fix:** Add `viewer_hash` based on IP/session fingerprint and check for recent view before inserting (e.g., within last hour). This can be done client-side with a simple localStorage check + server-side with a unique constraint.

**Files:** `src/pages/Verify.tsx`

---

### 6. Memoize expensive filter/stat computations

- **Dashboard.tsx** (lines 95-117): `filtered` and `stats` are recomputed on every render. Wrap in `useMemo`.
- **AnalyticsPage.tsx**: Already uses `useMemo` for `metrics` — good. But `viewsForUsers` (line 270-273) does a `.find()` inside a `.filter()`, which is O(n*m). Build a lookup map first.

**Files:** `src/pages/Dashboard.tsx`, `src/pages/admin/AnalyticsPage.tsx`

---

### 7. Dynamic import for heavy libraries

`html2canvas` and `jspdf` are already dynamically imported in AnalyticsPage — good. But `recharts` is statically imported across AdminDashboard and AnalyticsPage. Since these are admin-only, the lazy route loading (item 1) will handle this.

No additional changes needed beyond item 1.

---

### Summary of changes

| Change | Impact | Files |
|---|---|---|
| Lazy-load routes | ~40-60% smaller initial bundle | `App.tsx` |
| Parallelize waterfall queries | Faster page loads (2-4x on some pages) | `Dashboard.tsx`, `AssertionsPage.tsx`, `Verify.tsx` |
| Fix double-fetch in AuthContext | Eliminate 2-4 redundant API calls per navigation | `AuthContext.tsx` |
| Add staleTime defaults | Fewer refetches, snappier navigation | `App.tsx` |
| Dedupe badge_views inserts | Prevent view count inflation | `Verify.tsx` |
| Memoize filter computations | Smoother UI on re-renders | `Dashboard.tsx` |

