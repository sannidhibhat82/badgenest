import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { verify as verifyApi } from "@/lib/api";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink, Calendar, User, Building2, ShieldCheck, ShieldX, ChevronDown, Download, Code } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import badgenestLogo from "@/assets/badgenest-logo.png";
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function getStatus(assertion: any) {
  if (assertion.revoked) return { label: "Revoked", icon: XCircle, variant: "destructive" as const, color: "text-destructive" };
  if (assertion.expires_at && new Date(assertion.expires_at) < new Date()) return { label: "Expired", icon: AlertTriangle, variant: "secondary" as const, color: "text-yellow-600" };
  return { label: "Valid", icon: CheckCircle, variant: "default" as const, color: "text-green-600" };
}

function shouldTrackView(assertionId: string): boolean {
  const key = `badge_view_${assertionId}`;
  const lastView = localStorage.getItem(key);
  const now = Date.now();
  if (lastView && now - parseInt(lastView, 10) < 60 * 60 * 1000) return false;
  localStorage.setItem(key, String(now));
  return true;
}

export default function Verify() {
  const { assertionId } = useParams<{ assertionId: string }>();
  const [jsonOpen, setJsonOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["verify", assertionId],
    queryFn: async () => {
      const res = await verifyApi.assertion(assertionId!);
      if (shouldTrackView(assertionId!)) {
        verifyApi.recordView(assertionId!).catch(() => {});
      }
      const badge = res.badge_class;
      const issuer = res.issuer;
      const recipient = res.recipient;
      return {
        assertion: res.assertion,
        badge,
        issuer,
        recipient,
        viewCount: res.view_count ?? 0,
        hasSig: !!res.assertion?.signature,
        hasSnapshot: !!res.assertion?.snapshot_json,
      };
    },
    enabled: !!assertionId,
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  };

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(buildJsonLd(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `badge-${assertionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive">Badge not found.</p></div>;

  const { assertion, badge, issuer, recipient, viewCount, hasSig, hasSnapshot } = data;
  const status = getStatus(assertion);
  const StatusIcon = status.icon;

  function buildJsonLd() {
    return {
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
      recipient: { type: "email", identity: recipient?.full_name ?? "Unknown" },
      issuedOn: assertion.issued_at,
      expires: assertion.expires_at ?? undefined,
      revoked: assertion.revoked,
      revocationReason: assertion.revocation_reason ?? undefined,
      evidence: assertion.evidence_url ? [{ id: assertion.evidence_url }] : undefined,
      verification: { type: "signed" },
    };
  }

  const jsonLd = buildJsonLd();
  const badgeImageUrl = badge?.image_url?.startsWith("http") ? badge.image_url : badge?.image_url ? `${API_BASE}${badge.image_url}` : null;
  const issuerLogoUrl = issuer?.logo_url?.startsWith("http") ? issuer.logo_url : issuer?.logo_url ? `${API_BASE}${issuer.logo_url}` : null;

  return (
    <>
      <Helmet>
        <title>{badge?.name ?? "Badge"} — Verification | BadgeNest</title>
        <meta name="description" content={`Verify the "${badge?.name}" digital badge issued by ${issuer?.name ?? "BadgeNest"}.`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center gap-3 px-4 py-4">
            <img src={badgenestLogo} alt="BadgeNest" className="h-8" />
            <span className="font-semibold text-foreground">Badge Verification</span>
          </div>
        </header>

        <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
          <Card className={`border-2 ${status.label === "Valid" ? "border-green-500/40" : status.label === "Revoked" ? "border-destructive/40" : "border-yellow-500/40"}`}>
            <CardContent className="py-6 space-y-3">
              <div className="flex items-center gap-4">
                <StatusIcon className={`h-10 w-10 ${status.color}`} />
                <div>
                  <p className="text-lg font-bold">{status.label === "Valid" ? "✅ This badge is valid" : status.label === "Expired" ? "⚠️ This badge has expired" : "❌ This badge has been revoked"}</p>
                  {assertion.revocation_reason && <p className="text-sm text-muted-foreground">Reason: {assertion.revocation_reason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 pl-14">
                {hasSig ? (
                  <><ShieldCheck className="h-4 w-4 text-green-600" /><span className="text-sm text-green-600 font-medium">Signature verified</span></>
                ) : (
                  <><ShieldX className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">No cryptographic signature</span></>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start gap-4">
              {badgeImageUrl && <img src={badgeImageUrl} alt={badge?.name} className="h-20 w-20 rounded-lg object-contain border" />}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="font-medium">{recipient?.full_name || "Unknown"}</p>
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

          {issuer && (
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                {issuerLogoUrl ? <img src={issuerLogoUrl} alt={issuer.name} className="h-10 w-10 rounded object-contain" /> : <Building2 className="h-10 w-10 text-muted-foreground" />}
                <div>
                  <p className="text-xs text-muted-foreground">Issued by</p>
                  <p className="font-medium">{issuer.name}</p>
                  {issuer.website && <a href={issuer.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{issuer.website}</a>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 rounded-t-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Raw Metadata (JSON-LD)</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${jsonOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-80 font-mono">{JSON.stringify(jsonLd, null, 2)}</pre>
                  <Button variant="outline" size="sm" onClick={downloadJson} className="gap-2">
                    <Download className="h-4 w-4" /> Download Badge JSON
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              This badge has been verified <span className="font-semibold text-foreground">{viewCount}</span> time{viewCount !== 1 ? "s" : ""}
            </p>
            <Button variant="outline" onClick={copyLink} className="gap-2">
              <Copy className="h-4 w-4" /> Copy Verification Link
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
