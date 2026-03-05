import { Award, ExternalLink, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface BadgeCardProps {
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
  };
  onClick: () => void;
}

export default function BadgeCard({ assertion, onClick }: BadgeCardProps) {
  const isExpired =
    assertion.expires_at && new Date(assertion.expires_at) < new Date();
  const status = assertion.revoked
    ? "revoked"
    : isExpired
    ? "expired"
    : "active";

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            {assertion.badge_class.image_url ? (
              <img
                src={assertion.badge_class.image_url}
                alt={assertion.badge_class.name}
                className="h-24 w-24 rounded-xl object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-primary/10 shadow-md">
                <Award className="h-10 w-10 text-primary" />
              </div>
            )}
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "expired"
                  ? "secondary"
                  : "destructive"
              }
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] capitalize"
            >
              {status}
            </Badge>
          </div>

          <h3 className="mt-1 font-semibold leading-tight line-clamp-2">
            {assertion.badge_class.name}
          </h3>

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="line-clamp-1">{assertion.badge_class.issuer.name}</span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(assertion.issued_at), "MMM d, yyyy")}</span>
          </div>

          {assertion.evidence_url && (
            <div className="mt-1 flex items-center gap-1 text-xs text-primary">
              <ExternalLink className="h-3 w-3" />
              <span>Evidence</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
