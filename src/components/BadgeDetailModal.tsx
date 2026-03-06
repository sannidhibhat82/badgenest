import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Calendar,
  Building2,
  ExternalLink,
  Share2,
  Linkedin,
  Twitter,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  if (!assertion) return null;

  const isExpired =
    assertion.expires_at && new Date(assertion.expires_at) < new Date();
  const status = assertion.revoked
    ? "revoked"
    : isExpired
    ? "expired"
    : "active";

  const verifyUrl = `${window.location.origin}/verify/${assertion.id}`;

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
    const url = `https://www.linkedin.com/profile/add?${params.toString()}`;
    window.open(url, "_blank");
  };

  const shareToTwitter = () => {
    const text = `I just earned the "${assertion.badge_class.name}" badge from ${assertion.badge_class.issuer.name}! 🏆`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(verifyUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast.success("Verification link copied!");
  };

  const StatusIcon =
    status === "active"
      ? CheckCircle2
      : status === "expired"
      ? Clock
      : XCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Badge Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center">
          {assertion.badge_class.image_url ? (
            <img
              src={assertion.badge_class.image_url}
              alt={assertion.badge_class.name}
              className="h-32 w-32 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10 shadow-lg">
              <Award className="h-14 w-14 text-primary" />
            </div>
          )}

          <h2 className="mt-4 text-xl font-bold">{assertion.badge_class.name}</h2>

          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "expired"
                  ? "secondary"
                  : "destructive"
              }
              className="capitalize"
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {status}
            </Badge>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Issued by</p>
              <p className="text-muted-foreground">
                {assertion.badge_class.issuer.name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Issued on</p>
              <p className="text-muted-foreground">
                {format(new Date(assertion.issued_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {assertion.expires_at && (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Expires</p>
                <p className="text-muted-foreground">
                  {format(new Date(assertion.expires_at), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          )}

          {assertion.badge_class.description && (
            <div>
              <p className="font-medium">Description</p>
              <p className="mt-1 text-muted-foreground">
                {assertion.badge_class.description}
              </p>
            </div>
          )}

          {assertion.badge_class.criteria && (
            <div>
              <p className="font-medium">Criteria</p>
              <p className="mt-1 text-muted-foreground">
                {assertion.badge_class.criteria}
              </p>
            </div>
          )}

          {assertion.revoked && assertion.revocation_reason && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="font-medium text-destructive">Revocation Reason</p>
              <p className="mt-1 text-sm text-destructive/80">
                {assertion.revocation_reason}
              </p>
            </div>
          )}

          {assertion.evidence_url && (
            <div className="flex items-start gap-3">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Evidence</p>
                <a
                  href={assertion.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View evidence →
                </a>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div>
          <p className="mb-3 text-center text-sm font-medium">
            <Share2 className="mr-1 inline h-4 w-4" />
            Share this badge
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={shareToLinkedIn}>
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </Button>
            <Button variant="outline" size="sm" onClick={shareToTwitter}>
              <Twitter className="mr-2 h-4 w-4" />
              Twitter
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
