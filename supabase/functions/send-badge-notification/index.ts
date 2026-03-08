import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipientId, badgeName, evidenceUrl } = await req.json();

    if (!recipientId || !badgeName) {
      return new Response(
        JSON.stringify({ error: "recipientId and badgeName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", recipientId)
      .maybeSingle();

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: recipientId,
      title: "🎉 New Badge Earned!",
      message: `You have been awarded the "${badgeName}" badge.${evidenceUrl ? ` Evidence: ${evidenceUrl}` : ""}`,
    });

    // Send email notification via Lovable transactional email
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey && profile?.email) {
      try {
        const projectId = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1];
        const callbackUrl = `https://${projectId}.supabase.co/functions/v1`;

        const emailResponse = await fetch("https://email.lovable.dev/v1/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: profile.email,
            subject: `🎉 You earned the "${badgeName}" badge!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: hsl(220, 100%, 34%); font-size: 24px;">Congratulations${profile.full_name ? `, ${profile.full_name}` : ""}! 🎉</h1>
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  You have been awarded the <strong>"${badgeName}"</strong> badge.
                </p>
                ${evidenceUrl ? `<p style="color: #555; font-size: 14px;">Evidence: <a href="${evidenceUrl}" style="color: hsl(220, 100%, 34%);">${evidenceUrl}</a></p>` : ""}
                <p style="color: #555; font-size: 14px; margin-top: 20px;">
                  Log in to your dashboard to view your badges.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">Evolve Careers Badge Platform</p>
              </div>
            `,
            purpose: "transactional",
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Email notification error:", emailErr);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: profile?.email || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
