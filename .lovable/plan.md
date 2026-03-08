

## Assessment: Signed Metadata, Verification Pages, and Credential Longevity

### What You Already Have

**Public Verification Pages** -- Already fully implemented at `/verify/:assertionId`. Shows recipient, issuer, criteria, issue date, status, evidence, and view count. Includes JSON-LD metadata in Open Badges v2 format.

**Credential Longevity** -- Partially covered. Badges persist in the database indefinitely, verification URLs are permanent, and expiry/revocation states are tracked. However, there's no tamper-proof guarantee that the data hasn't been modified after issuance.

**Signed Badge Metadata** -- Not implemented. The JSON-LD is generated dynamically from current database state, meaning if someone edits a badge name or description after issuance, the verification page silently reflects the change. There's no cryptographic proof that the credential is authentic and unaltered.

### What I Recommend Building

**1. Assertion Signature (HMAC-based integrity hash)**

Add a `signature` column to the `assertions` table. When a badge is issued, compute an HMAC-SHA256 hash over the immutable fields (recipient, badge class, issuer, issued date, evidence) using a server-side secret. The verification page then re-computes and compares the hash to show a "Tamper-proof" or "Integrity verified" indicator.

This is not full PKI/blockchain signing but provides meaningful tamper detection that's practical and doesn't require external services.

**2. Enhanced Verification Page**

- Add a collapsible "Raw Metadata (JSON)" viewer so technical users can inspect the full Open Badges JSON-LD
- Add a "Download Badge JSON" button for portability
- Show the signature hash and integrity status ("Signature verified" checkmark)
- Fix the recipient field to use hashed email per OB spec instead of plain name

**3. Credential Longevity: Snapshot at Issuance**

Add `snapshot_json` (JSONB) to assertions. At issuance time, store a frozen copy of the badge name, description, criteria, and issuer details. The verification page reads from the snapshot rather than live data, so even if badge classes are later edited, the credential shows what was true at the time of issuance.

### Technical Changes

**Database migration:**
- Add `signature` (text, nullable) to `assertions`
- Add `snapshot_json` (jsonb, nullable) to `assertions`

**Edge function** (`supabase/functions/sign-assertion/index.ts`):
- Called during badge issuance
- Computes HMAC-SHA256 over canonical JSON of assertion fields
- Stores signature and snapshot on the assertion row

**Files to modify:**
1. `src/pages/Verify.tsx` -- Add JSON viewer, download button, signature verification display, use snapshot data
2. `src/pages/admin/AssertionsPage.tsx` -- Call sign-assertion edge function on issue
3. New: `supabase/functions/sign-assertion/index.ts` -- Server-side signing logic

### Verification Page Layout After Changes

```text
┌─────────────────────────────────────┐
│ ✅ This badge is valid              │
│ 🔒 Signature verified              │
├─────────────────────────────────────┤
│ [Badge Image]  Badge Name           │
│                Status badge         │
│ Description / Criteria / Evidence   │
├──────────────┬──────────────────────┤
│ Recipient    │ Issued / Expires     │
├──────────────┴──────────────────────┤
│ Issuer info                         │
├─────────────────────────────────────┤
│ ▸ View Raw Metadata (JSON)          │
│   [Download Badge JSON]             │
├─────────────────────────────────────┤
│ Verified X times · [Copy Link]      │
└─────────────────────────────────────┘
```

