import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Shield,
  Eye,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import badgenestLogo from "@/assets/badgenest-logo.png";

function getStatus(a: { revoked: boolean; expires_at: string | null }) {
  if (a.revoked) return { label: "Revoked", variant: "destructive" as const, icon: XCircle };
  if (a.expires_at && new Date(a.expires_at) < new Date())
    return { label: "Expired", variant: "secondary" as const, icon: AlertTriangle };
  return { label: "Active", variant: "default" as const, icon: CheckCircle };
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      // Use RPC function to get profile without exposing email (works for anon users)
      const { data: profileRows, error: pErr } = await supabase
        .rpc("get_public_profile", { _user_id: userId! });
      if (pErr) throw pErr;
      const profile = profileRows?.[0];
      if (!profile) throw new Error("Profile not found");

      const { data: assertions } = await supabase
        .from("assertions")
        .select("id, issued_at, expires_at, revoked, badge_class_id, evidence_url")
        .eq("recipient_id", userId!)
        .eq("revoked", false)
        .order("issued_at", { ascending: false });

      const badgeIds = [...new Set((assertions ?? []).map((a) => a.badge_class_id))];
      const { data: badges } = badgeIds.length
        ? await supabase.from("badge_classes").select("id, name, description, image_url, issuer_id").in("id", badgeIds)
        : { data: [] };

      const issuerIds = [...new Set((badges ?? []).map((b) => b.issuer_id))];
      const { data: issuers } = issuerIds.length
        ? await supabase.from("issuers").select("id, name, logo_url").in("id", issuerIds)
        : { data: [] };

      const { data: viewCounts } = await supabase.from("badge_views").select("assertion_id");
      const viewMap: Record<string, number> = {};
      for (const v of viewCounts ?? []) {
        viewMap[v.assertion_id] = (viewMap[v.assertion_id] || 0) + 1;
      }

      const issuerMap = Object.fromEntries((issuers ?? []).map((i) => [i.id, i]));
      const badgeMap = Object.fromEntries(
        (badges ?? []).map((b) => [b.id, { ...b, issuer: issuerMap[b.issuer_id] }])
      );
      const uniqueIssuers = new Set((badges ?? []).map((b) => b.issuer_id));

      return {
        profile,
        assertions: (assertions ?? []).map((a) => ({
          ...a,
          badge: badgeMap[a.badge_class_id],
          views: viewMap[a.id] || 0,
        })),
        totalViews: Object.values(viewMap).reduce((s, v) => s + v, 0),
        uniqueIssuerCount: uniqueIssuers.size,
      };
    },
    enabled: !!userId,
  });

  const initials = data?.profile?.full_name
    ? data.profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Award className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-lg font-semibold text-foreground">Profile not found</p>
          <p className="text-sm text-muted-foreground mt-1">This profile may not exist or is private.</p>
        </div>
      </div>
    );

  const activeCount = data.assertions.filter(
    (a) => !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date())
  ).length;

  return (
    <>
      <Helmet>
        <title>{data.profile.full_name ?? "Learner"} — Badge Portfolio | BadgeNest</title>
        <meta
          name="description"
          content={`View ${data.profile.full_name}'s ${activeCount} earned digital badges on BadgeNest.`}
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 glass">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src={badgenestLogo} alt="BadgeNest" className="h-7" />
              <Separator orientation="vertical" className="h-5" />
              <span className="text-sm font-medium text-muted-foreground">Badge Portfolio</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Verified Credentials</span>
            </div>
          </div>
        </header>

        {/* Hero with decorative shapes */}
        <div className="relative overflow-hidden">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 gradient-mesh" />
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative container mx-auto max-w-4xl px-4 py-14">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 animate-slide-up">
              <Avatar className="h-28 w-28 ring-4 ring-card shadow-elevated">
                <AvatarImage src={data.profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {data.profile.full_name || "Learner"}
                </h1>
                <p className="mt-1 text-muted-foreground">Digital credential portfolio</p>

                {/* Stats row */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur-sm px-3 py-1.5 text-sm shadow-sm border border-border/50">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{activeCount}</span>
                    <span className="text-muted-foreground">badge{activeCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur-sm px-3 py-1.5 text-sm shadow-sm border border-border/50">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{data.uniqueIssuerCount}</span>
                    <span className="text-muted-foreground">issuer{data.uniqueIssuerCount !== 1 ? "s" : ""}</span>
                  </div>
                  {data.totalViews > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur-sm px-3 py-1.5 text-sm shadow-sm border border-border/50">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{data.totalViews}</span>
                      <span className="text-muted-foreground">view{data.totalViews !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badge grid */}
        <main className="container mx-auto max-w-4xl px-4 py-8">
          {data.assertions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-16 text-center animate-fade-in">
              <div className="rounded-2xl bg-muted/50 p-6">
                <Award className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <p className="mt-6 text-lg font-semibold text-foreground">No badges earned yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Badges will appear here once earned.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {data.assertions.map((a) => {
                const status = getStatus(a);
                const StatusIcon = status.icon;
                return (
                  <Link key={a.id} to={`/verify/${a.id}`} className="group">
                    <Card className="h-full border-border/60 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 group-hover:border-primary/20 overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {a.badge?.image_url ? (
                            <div className="shrink-0 rounded-xl bg-muted/50 p-1.5 ring-1 ring-border group-hover:ring-primary/20 transition-all duration-300">
                              <img
                                src={a.badge.image_url}
                                alt={a.badge.name}
                                className="h-14 w-14 rounded-lg object-contain transition-transform duration-300 group-hover:scale-110"
                              />
                            </div>
                          ) : (
                            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <Award className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {a.badge?.name ?? "Unknown Badge"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {a.badge?.issuer?.name ?? "Unknown Issuer"}
                            </p>
                            <div className="mt-2">
                              <Badge variant={status.variant} className="text-[10px]">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.issued_at), "MMM d, yyyy")}
                          </span>
                          <div className="flex items-center gap-3">
                            {a.views > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {a.views}
                              </span>
                            )}
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/60 mt-12">
          <div className="container mx-auto max-w-4xl px-4 py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Credentials verified by Evolve Careers · Open Badges compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
