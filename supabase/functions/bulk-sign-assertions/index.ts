import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all unsigned assertions
    const { data: unsigned, error: fetchErr } = await supabase
      .from("assertions")
      .select("id, badge_class_id, recipient_id, issued_at, expires_at, evidence_url")
      .is("signature", null);
    if (fetchErr) throw fetchErr;

    if (!unsigned || unsigned.length === 0) {
      return new Response(JSON.stringify({ signed: 0, message: "No unsigned assertions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect unique badge_class_ids and recipient_ids
    const badgeIds = [...new Set(unsigned.map((a) => a.badge_class_id))];
    const recipientIds = [...new Set(unsigned.map((a) => a.recipient_id))];

    // Batch fetch badges, issuers, profiles
    const { data: badges } = await supabase
      .from("badge_classes")
      .select("*")
      .in("id", badgeIds);

    const issuerIds = [...new Set((badges || []).map((b) => b.issuer_id))];
    const { data: issuers } = issuerIds.length > 0
      ? await supabase.from("issuers").select("*").in("id", issuerIds)
      : { data: [] };

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", recipientIds);

    // Build lookup maps
    const badgeMap = new Map((badges || []).map((b) => [b.id, b]));
    const issuerMap = new Map((issuers || []).map((i) => [i.id, i]));
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    let signed = 0;
    const errors: string[] = [];

    for (const assertion of unsigned) {
      try {
        const badge = badgeMap.get(assertion.badge_class_id) || null;
        const issuer = badge ? issuerMap.get(badge.issuer_id) || null : null;
        const profile = profileMap.get(assertion.recipient_id) || null;

        const snapshot = {
          assertion: {
            id: assertion.id,
            issued_at: assertion.issued_at,
            expires_at: assertion.expires_at,
            evidence_url: assertion.evidence_url,
            recipient_id: assertion.recipient_id,
          },
          badge: badge
            ? { id: badge.id, name: badge.name, description: badge.description, criteria: badge.criteria, image_url: badge.image_url }
            : null,
          issuer: issuer
            ? { id: issuer.id, name: issuer.name, email: issuer.email, website: issuer.website, logo_url: issuer.logo_url }
            : null,
          recipient: profile
            ? { full_name: profile.full_name, email: profile.email }
            : null,
          signed_at: new Date().toISOString(),
        };

        const canonical = JSON.stringify(snapshot, Object.keys(snapshot).sort());
        const signature = await hmacSign(serviceRoleKey, canonical);

        const { error: updateErr } = await supabase
          .from("assertions")
          .update({ signature, snapshot_json: snapshot })
          .eq("id", assertion.id);

        if (updateErr) {
          errors.push(`${assertion.id}: ${updateErr.message}`);
        } else {
          signed++;
        }
      } catch (e) {
        errors.push(`${assertion.id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ signed, total: unsigned.length, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
