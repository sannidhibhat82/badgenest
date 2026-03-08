import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function dispatchWebhooks(supabase: any, event: string, payload: any) {
  const { data: hooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("active", true)
    .contains("events", [event]);

  if (!hooks || hooks.length === 0) return;

  for (const hook of hooks) {
    try {
      const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
      const encoder = new TextEncoder();
      const keyData = encoder.encode(hook.secret);
      const msgData = encoder.encode(body);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      const res = await fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Webhook-Signature": signature },
        body,
      });

      if (res.ok) {
        await supabase.from("webhooks").update({ last_triggered_at: new Date().toISOString(), failure_count: 0 }).eq("id", hook.id);
      } else {
        await supabase.from("webhooks").update({ failure_count: hook.failure_count + 1 }).eq("id", hook.id);
      }
    } catch {
      await supabase.from("webhooks").update({ failure_count: hook.failure_count + 1 }).eq("id", hook.id);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Authenticate via X-API-Key header
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keyHash = await hashKey(apiKey);
  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("revoked", false)
    .maybeSingle();

  if (!keyRecord) {
    return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "API key expired" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update last_used_at
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/public-api\/?/, "");
  const permissions: string[] = keyRecord.permissions || [];

  try {
    // GET /badges — list badge classes
    if (req.method === "GET" && (path === "badges" || path === "badges/")) {
      if (!permissions.includes("badge.list")) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.from("badge_classes").select("id, name, description, criteria, image_url, issuer_id, expiry_days, created_at");
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /assertions — list assertions
    if (req.method === "GET" && (path === "assertions" || path === "assertions/")) {
      if (!permissions.includes("assertion.list")) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const { data, error } = await supabase
        .from("assertions")
        .select("id, recipient_id, badge_class_id, issued_at, expires_at, revoked, evidence_url")
        .order("issued_at", { ascending: false })
        .range(offset, offset + Math.min(limit, 100) - 1);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /assertions — issue a badge
    if (req.method === "POST" && (path === "assertions" || path === "assertions/")) {
      if (!permissions.includes("badge.issue")) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const body = await req.json();
      const { recipient_email, badge_class_id, evidence_url } = body;

      if (!recipient_email || !badge_class_id) {
        return new Response(JSON.stringify({ error: "recipient_email and badge_class_id are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: profile } = await supabase.from("profiles").select("user_id").eq("email", recipient_email.trim().toLowerCase()).maybeSingle();
      if (!profile) {
        return new Response(JSON.stringify({ error: `No learner found with email: ${recipient_email}` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: badge } = await supabase.from("badge_classes").select("id").eq("id", badge_class_id).maybeSingle();
      if (!badge) {
        return new Response(JSON.stringify({ error: "Badge class not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: inserted, error } = await supabase.from("assertions").insert({
        recipient_id: profile.user_id,
        badge_class_id,
        evidence_url: evidence_url || null,
      }).select("id, recipient_id, badge_class_id, issued_at").single();
      if (error) throw error;

      // Audit
      await supabase.from("audit_logs").insert({
        actor_id: keyRecord.created_by,
        action: "badge.issued",
        entity_type: "assertion",
        entity_id: inserted.id,
        details: { via: "api", api_key_name: keyRecord.name, recipient_email },
      });

      // Dispatch webhooks
      await dispatchWebhooks(supabase, "badge.issued", { assertion_id: inserted.id, recipient_email, badge_class_id });

      return new Response(JSON.stringify({ data: inserted }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /assertions/:id/revoke
    if (req.method === "POST" && path.match(/^assertions\/[^/]+\/revoke$/)) {
      if (!permissions.includes("badge.revoke")) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const assertionId = path.split("/")[1];
      const body = await req.json().catch(() => ({}));
      const reason = body.reason || "Revoked via API";

      const { data: updated, error } = await supabase.from("assertions")
        .update({ revoked: true, revocation_reason: reason })
        .eq("id", assertionId)
        .select("id, revoked, revocation_reason")
        .single();
      if (error) throw error;

      await supabase.from("audit_logs").insert({
        actor_id: keyRecord.created_by,
        action: "badge.revoked",
        entity_type: "assertion",
        entity_id: assertionId,
        details: { via: "api", api_key_name: keyRecord.name, reason },
      });

      await dispatchWebhooks(supabase, "badge.revoked", { assertion_id: assertionId, reason });

      return new Response(JSON.stringify({ data: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found", endpoints: ["GET /badges", "GET /assertions", "POST /assertions", "POST /assertions/:id/revoke"] }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
