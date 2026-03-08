import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  Calendar,
  Building2,
  ExternalLink,
  Share2,
  Linkedin,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
  Code,
  Copy,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface BadgeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assertion: {
    id: string;
    issued_at: string;
    expires_at: string | null;
    revoked: boolean;
    revocation_reason: string | null;
    evidence_url: string | null;
    badge_class: {
      id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      criteria: string | null;
      issuer: {
        name: string;
        logo_url: string | null;
      };
    };
  } | null;
}

export default function BadgeDetailModal({
  open,
  onOpenChange,
  assertion,
}: BadgeDetailModalProps) {
  const [embedTab, setEmbedTab] = useState<string>("html");

  if (!assertion) return null;

  const isExpired =
    assertion.expires_at && new Date(assertion.expires_at) < new Date();
  const status = assertion.revoked
    ? "revoked"
    : isExpired
    ? "expired"
    : "active";

  const verifyUrl = `${window.location.origin}/verify/${assertion.id}`;

  const embedHtml = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;text-decoration:none;color:#1a202c;font-family:sans-serif;">
  ${assertion.badge_class.image_url ? `<img src="${assertion.badge_class.image_url}" alt="${assertion.badge_class.name}" style="width:40px;height:40px;border-radius:6px;object-fit:contain;" />` : ""}
  <span>
    <strong style="display:block;font-size:14px;">${assertion.badge_class.name}</strong>
    <span style="font-size:12px;color:#718096;">Issued by ${assertion.badge_class.issuer.name}</span>
  </span>
</a>`;

  const embedMarkdown = `[![${assertion.badge_class.name}](${assertion.badge_class.image_url || ""})](${verifyUrl})`;

  const shareToLinkedIn = () => {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: assertion.badge_class.name,
      organizationName: assertion.badge_class.issuer.name,
      certUrl: verifyUrl,
      certId: assertion.id,
    });
    const issuedDate = new Date(assertion.issued_at);
    params.set("issueYear", String(issuedDate.getFullYear()));
    params.set("issueMonth", String(issuedDate.getMonth() + 1));
    if (assertion.expires_at) {
      const expDate = new Date(assertion.expires_at);
      params.set("expirationYear", String(expDate.getFullYear()));
      params.set("expirationMonth", String(expDate.getMonth() + 1));
    }
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank");
  };

  const shareToX = () => {
    const text = `I just earned the "${assertion.badge_class.name}" badge from ${assertion.badge_class.issuer.name}! 🏆`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(verifyUrl)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=500"
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast.success("Verification link copied!");
  };

  const copyEmbed = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Embed code copied!");
  };

  const StatusIcon = status === "active" ? CheckCircle2 : status === "expired" ? Clock : XCircle;
  const statusColor =
    status === "active"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "expired"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Badge Details</DialogTitle>
        </DialogHeader>

        {/* Hero section with gradient */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-6">
          <div className="flex flex-col items-center text-center">
            {assertion.badge_class.image_url ? (
              <div className="rounded-2xl bg-card p-3 shadow-lg ring-1 ring-border">
                <img
                  src={assertion.badge_class.image_url}
                  alt={assertion.badge_class.name}
                  crossOrigin="anonymous"
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div>';
                  }}
                />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10 shadow-lg ring-1 ring-border">
                <Award className="h-14 w-14 text-primary" />
              </div>
            )}
            <h2 className="mt-4 text-xl font-bold text-foreground">{assertion.badge_class.name}</h2>
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusColor}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Issued by</p>
                <p className="font-medium text-foreground">{assertion.badge_class.issuer.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Issued on</p>
                  <p className="font-medium text-foreground">{format(new Date(assertion.issued_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              {assertion.expires_at ? (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expires</p>
                    <p className="font-medium text-foreground">{format(new Date(assertion.expires_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expires</p>
                    <p className="font-medium text-foreground">Never</p>
                  </div>
                </div>
              )}
            </div>

            {assertion.badge_class.description && (
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{assertion.badge_class.description}</p>
              </div>
            )}

            {assertion.badge_class.criteria && (
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Criteria</p>
                <p className="text-sm text-foreground leading-relaxed">{assertion.badge_class.criteria}</p>
              </div>
            )}

            {assertion.revoked && assertion.revocation_reason && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="font-medium text-destructive text-xs uppercase tracking-wider">Revocation Reason</p>
                <p className="mt-1 text-sm text-destructive/80">{assertion.revocation_reason}</p>
              </div>
            )}

            {assertion.evidence_url && (
              <a
                href={assertion.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Evidence</p>
                  <p className="text-sm font-medium text-primary">View evidence →</p>
                </div>
              </a>
            )}
          </div>

          <Separator />

          {/* Share & Add to LinkedIn */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Share2 className="mr-1.5 inline h-3.5 w-3.5" />
              Share & Add to Profile
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareToLinkedIn}
                className="w-full justify-start gap-3 h-10 hover:bg-[#0077B5]/5 hover:border-[#0077B5]/30 hover:text-[#0077B5]"
              >
                <Linkedin className="h-4 w-4 shrink-0" />
                <span className="text-xs">Add to LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareToX}
                className="w-full justify-start gap-3 h-10 hover:bg-foreground/5 hover:border-foreground/30"
              >
                <XIcon className="h-4 w-4 shrink-0" />
                <span className="text-xs">Share on X</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="w-full justify-start gap-3 h-10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
              >
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span className="text-xs">Copy Verification Link</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Embed Widget */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Code className="mr-1.5 inline h-3.5 w-3.5" />
              Embed Badge
            </p>
            <Tabs value={embedTab} onValueChange={setEmbedTab}>
              <TabsList className="w-full">
                <TabsTrigger value="html" className="flex-1">HTML</TabsTrigger>
                <TabsTrigger value="markdown" className="flex-1">Markdown</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <div className="relative">
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-32 font-mono">{embedHtml}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => copyEmbed(embedHtml)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="markdown">
                <div className="relative">
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto font-mono">{embedMarkdown}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => copyEmbed(embedMarkdown)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              Paste this code into your website, email signature, or portfolio.
            </p>
          </div>

          {/* Verify link */}
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Shield className="h-3.5 w-3.5" />
              View public verification page →
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
