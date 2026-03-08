import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink, Calendar, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import evolveLogo from "@/assets/evolve-logo.png";

function getStatus(assertion: any) {
  if (assertion.revoked) return { label: "Revoked", icon: XCircle, variant: "destructive" as const, color: "text-destructive" };
  if (assertion.expires_at && new Date(assertion.expires_at) < new Date()) return { label: "Expired", icon: AlertTriangle, variant: "secondary" as const, color: "text-yellow-600" };
  return { label: "Valid", icon: CheckCircle, variant: "default" as const, color: "text-green-600" };
}

export default function Verify() {
  const { assertionId } = useParams<{ assertionId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["verify", assertionId],
    queryFn: async () => {
      const { data: assertion, error } = await supabase
        .from("assertions")
        .select("*")
        .eq("id", assertionId!)
        .single();
      if (error) throw error;

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
        .select("full_name, avatar_url")
        .eq("user_id", assertion.recipient_id)
        .single();

      // Track view
      await supabase.from("badge_views").insert({ assertion_id: assertionId! });

      // Get view count
      const { count } = await supabase
        .from("badge_views")
        .select("*", { count: "exact", head: true })
        .eq("assertion_id", assertionId!);

      return { assertion, badge, issuer, profile, viewCount: count ?? 0 };
    },
    enabled: !!assertionId,
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive">Badge not found.</p></div>;

  const { assertion, badge, issuer, profile, viewCount } = data;
  const status = getStatus(assertion);
  const StatusIcon = status.icon;

  const jsonLd = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: window.location.href,
    badge: {
      type: "BadgeClass",
      name: badge?.name,
      description: badge?.description,
      image: badge?.image_url,
      criteria: { narrative: badge?.criteria },
      issuer: {
        type: "Issuer",
        name: issuer?.name,
        url: issuer?.website,
        email: issuer?.email,
        image: issuer?.logo_url,
      },
    },
    recipient: { type: "email", identity: profile?.full_name ?? "Unknown" },
    issuedOn: assertion.issued_at,
    expires: assertion.expires_at ?? undefined,
    revoked: assertion.revoked,
    revocationReason: assertion.revocation_reason ?? undefined,
    evidence: assertion.evidence_url ? [{ id: assertion.evidence_url }] : undefined,
  };

  return (
    <>
      <Helmet>
        <title>{badge?.name ?? "Badge"} — Verification | Evolve Careers</title>
        <meta name="description" content={`Verify the "${badge?.name}" digital badge issued by ${issuer?.name ?? "Evolve Careers"}.`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center gap-3 px-4 py-4">
            <img src={evolveLogo} alt="Evolve Careers" className="h-8" />
            <span className="font-semibold text-foreground">Badge Verification</span>
          </div>
        </header>

        <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
          {/* Status Banner */}
          <Card className={`border-2 ${status.label === "Valid" ? "border-green-500/40" : status.label === "Revoked" ? "border-destructive/40" : "border-yellow-500/40"}`}>
            <CardContent className="flex items-center gap-4 py-6">
              <StatusIcon className={`h-10 w-10 ${status.color}`} />
              <div>
                <p className="text-lg font-bold">{status.label === "Valid" ? "✅ This badge is valid" : status.label === "Expired" ? "⚠️ This badge has expired" : "❌ This badge has been revoked"}</p>
                {assertion.revocation_reason && <p className="text-sm text-muted-foreground">Reason: {assertion.revocation_reason}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Badge Info */}
          <Card>
            <CardHeader className="flex flex-row items-start gap-4">
              {badge?.image_url && <img src={badge.image_url} alt={badge.name} className="h-20 w-20 rounded-lg object-contain border" />}
              <div className="space-y-1">
                <CardTitle className="text-xl">{badge?.name}</CardTitle>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {badge?.description && <p className="text-muted-foreground">{badge.description}</p>}
              {badge?.criteria && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Criteria</h4>
                  <p className="text-sm text-muted-foreground">{badge.criteria}</p>
                </div>
              )}
              {assertion.evidence_url && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Evidence</h4>
                  <a href={assertion.evidence_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    View evidence <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient & Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="font-medium">{format(new Date(assertion.issued_at), "MMM d, yyyy")}</p>
                  {assertion.expires_at && <p className="text-xs text-muted-foreground">Expires: {format(new Date(assertion.expires_at), "MMM d, yyyy")}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issuer */}
          {issuer && (
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                {issuer.logo_url ? <img src={issuer.logo_url} alt={issuer.name} className="h-10 w-10 rounded object-contain" /> : <Building2 className="h-10 w-10 text-muted-foreground" />}
                <div>
                  <p className="text-xs text-muted-foreground">Issued by</p>
                  <p className="font-medium">{issuer.name}</p>
                  {issuer.website && <a href={issuer.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{issuer.website}</a>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={copyLink} className="gap-2">
              <Copy className="h-4 w-4" /> Copy Verification Link
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
