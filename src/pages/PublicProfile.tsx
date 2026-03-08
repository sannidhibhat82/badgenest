import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, CheckCircle, XCircle, AlertTriangle, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import evolveLogo from "@/assets/evolve-logo.png";

function getStatus(a: { revoked: boolean; expires_at: string | null }) {
  if (a.revoked) return { label: "Revoked", variant: "destructive" as const, icon: XCircle };
  if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", variant: "secondary" as const, icon: AlertTriangle };
  return { label: "Active", variant: "default" as const, icon: CheckCircle };
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", userId!)
        .single();
      if (pErr) throw pErr;

      const { data: assertions } = await supabase
        .from("assertions")
        .select("id, issued_at, expires_at, revoked, badge_class_id")
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

      // Fetch view counts for each assertion
      const { data: viewCounts } = await supabase
        .from("badge_views")
        .select("assertion_id");

      const viewMap: Record<string, number> = {};
      for (const v of viewCounts ?? []) {
        viewMap[v.assertion_id] = (viewMap[v.assertion_id] || 0) + 1;
      }

      const issuerMap = Object.fromEntries((issuers ?? []).map((i) => [i.id, i]));
      const badgeMap = Object.fromEntries((badges ?? []).map((b) => [b.id, { ...b, issuer: issuerMap[b.issuer_id] }]));

      return {
        profile,
        assertions: (assertions ?? []).map((a) => ({
          ...a,
          badge: badgeMap[a.badge_class_id],
          views: viewMap[a.id] || 0,
        })),
      };
    },
    enabled: !!userId,
  });

  const initials = data?.profile?.full_name
    ? data.profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading profile…</p></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center"><p className="text-destructive">Profile not found.</p></div>;

  const activeCount = data.assertions.filter((a) => !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date())).length;

  return (
    <>
      <Helmet>
        <title>{data.profile.full_name ?? "Learner"} — Badge Portfolio | Evolve Careers</title>
        <meta name="description" content={`View ${data.profile.full_name}'s ${activeCount} earned digital badges on Evolve Careers.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center gap-3 px-4 py-4">
            <img src={evolveLogo} alt="Evolve Careers" className="h-8" />
            <span className="font-semibold text-foreground">Badge Portfolio</span>
          </div>
        </header>

        <main className="container mx-auto max-w-4xl px-4 py-10">
          {/* Profile header */}
          <div className="flex flex-col items-center text-center mb-10">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={data.profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold text-foreground">{data.profile.full_name || "Learner"}</h1>
            <p className="text-muted-foreground mt-1">{activeCount} badge{activeCount !== 1 ? "s" : ""} earned</p>
          </div>

          {/* Badge grid */}
          {data.assertions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Award className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">No badges earned yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.assertions.map((a) => {
                const status = getStatus(a);
                const StatusIcon = status.icon;
                return (
                  <Link key={a.id} to={`/verify/${a.id}`}>
                    <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          {a.badge?.image_url ? (
                            <img src={a.badge.image_url} alt={a.badge.name} className="h-14 w-14 rounded-lg object-contain border" />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                              <Award className="h-7 w-7 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-foreground">{a.badge?.name ?? "Unknown Badge"}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.badge?.issuer?.name ?? "Unknown Issuer"}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={status.variant} className="text-[10px]">
                                <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.issued_at), "MMM d, yyyy")}
                          </span>
                          {a.views > 0 && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />{a.views} view{a.views !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
