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
    const { assertion_id } = await req.json();
    if (!assertion_id) {
      return new Response(JSON.stringify({ error: "assertion_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch assertion with related data
    const { data: assertion, error: aErr } = await supabase
      .from("assertions")
      .select("*")
      .eq("id", assertion_id)
      .single();
    if (aErr) throw aErr;

    const { data: badge } = await supabase
      .from("badge_classes")
      .select("*")
      .eq("id", assertion.badge_class_id)
      .single();

    const { data: issuer } = badge
      ? await supabase.from("issuers").select("*").eq("id", badge.issuer_id).single()
      : { data: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", assertion.recipient_id)
      .single();

    // Build snapshot — frozen copy of badge data at issuance time
    const snapshot = {
      assertion: {
        id: assertion.id,
        issued_at: assertion.issued_at,
        expires_at: assertion.expires_at,
        evidence_url: assertion.evidence_url,
        recipient_id: assertion.recipient_id,
      },
      badge: badge
        ? {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            criteria: badge.criteria,
            image_url: badge.image_url,
          }
        : null,
      issuer: issuer
        ? {
            id: issuer.id,
            name: issuer.name,
            email: issuer.email,
            website: issuer.website,
            logo_url: issuer.logo_url,
          }
        : null,
      recipient: profile
        ? { full_name: profile.full_name, email: profile.email }
        : null,
      signed_at: new Date().toISOString(),
    };

    // Canonical JSON for signing (deterministic key order via sorted keys)
    const canonical = JSON.stringify(snapshot, Object.keys(snapshot).sort());

    // Use service role key as HMAC secret (always available, never exposed to client)
    const signature = await hmacSign(serviceRoleKey, canonical);

    // Store signature and snapshot
    const { error: updateErr } = await supabase
      .from("assertions")
      .update({ signature, snapshot_json: snapshot })
      .eq("id", assertion_id);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, signature }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
