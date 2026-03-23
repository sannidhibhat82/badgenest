import { Award, Calendar, Building2 } from "lucide-react";
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
      className="group cursor-pointer overflow-hidden border-border/60 bg-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-primary/20"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image area with gradient overlay on hover */}
        <div className="relative flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-6">
          {assertion.badge_class.image_url ? (
            <img
              src={assertion.badge_class.image_url}
              alt={assertion.badge_class.name}
              className="h-20 w-20 rounded-xl object-cover shadow-sm transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-10 w-10 text-primary" />
            </div>
          )}
          {/* Status badge overlay */}
          <Badge
            variant={
              status === "active"
                ? "default"
                : status === "expired"
                ? "secondary"
                : "destructive"
            }
            className="absolute top-3 right-3 text-[10px] capitalize shadow-sm"
          >
            {status}
          </Badge>
          {/* Glassmorphic description on hover */}
          {assertion.badge_class.description && (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <p className="p-4 text-xs text-primary-foreground line-clamp-3 leading-relaxed">
                {assertion.badge_class.description}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {assertion.badge_class.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{assertion.badge_class.issuer.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{format(new Date(assertion.issued_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
