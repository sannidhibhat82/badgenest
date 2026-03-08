import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import LearnerLayout from "@/layouts/LearnerLayout";
import BadgeCard from "@/components/BadgeCard";
import BadgeDetailModal from "@/components/BadgeDetailModal";
import { Award, Search, LayoutGrid, List, Eye, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BadgeAssertion = {
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

export default function LearnerDashboard() {
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState<BadgeAssertion | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: assertions, isLoading } = useQuery({
    queryKey: ["my-badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assertions")
        .select("id, issued_at, expires_at, revoked, revocation_reason, evidence_url, badge_class_id")
        .eq("recipient_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;

      const badgeClassIds = [...new Set(data.map((a) => a.badge_class_id))];
      
      // Parallelize badge, issuer, and views fetches
      const [{ data: badges }, viewResult] = await Promise.all([
        supabase.from("badge_classes").select("id, name, description, image_url, criteria, issuer_id").in("id", badgeClassIds),
        data.length > 0
          ? supabase.from("badge_views").select("assertion_id").in("assertion_id", data.map((a) => a.id))
          : Promise.resolve({ data: [] }),
      ]);

      const issuerIds = [...new Set((badges ?? []).map((b) => b.issuer_id))];
      const { data: issuers } = await supabase.from("issuers").select("id, name, logo_url").in("id", issuerIds);

      const viewMap: Record<string, number> = {};
      for (const v of (viewResult as any).data ?? []) {
        viewMap[v.assertion_id] = (viewMap[v.assertion_id] || 0) + 1;
      }

      const issuerMap = Object.fromEntries((issuers ?? []).map((i) => [i.id, i]));
      const badgeMap = Object.fromEntries(
        (badges ?? []).map((b) => [
          b.id,
          { ...b, issuer: issuerMap[b.issuer_id] ?? { name: "Unknown", logo_url: null } },
        ])
      );

      return data.map((a) => ({
        ...a,
        views: viewMap[a.id] || 0,
        badge_class: badgeMap[a.badge_class_id] ?? {
          id: a.badge_class_id,
          name: "Unknown Badge",
          description: null,
          image_url: null,
          criteria: null,
          issuer: { name: "Unknown", logo_url: null },
        },
      })) as (BadgeAssertion & { views: number })[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return (assertions ?? []).filter((a) => {
      if (search && !a.badge_class.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "active") return !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date());
      if (filter === "expired") return !a.revoked && a.expires_at && new Date(a.expires_at) < new Date();
      if (filter === "revoked") return a.revoked;
      return true;
    });
  }, [assertions, search, filter]);

  const { totalViews, stats } = useMemo(() => {
    const all = assertions ?? [];
    const totalViews = all.reduce((sum, a: any) => sum + (a.views || 0), 0);
    const stats = {
      total: all.length,
      active: all.filter((a) => !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date())).length,
      expired: all.filter((a) => !a.revoked && a.expires_at && new Date(a.expires_at) < new Date()).length,
      revoked: all.filter((a) => a.revoked).length,
    };
    return { totalViews, stats };
  }, [assertions]);

  const statCards = [
    { label: "Total Badges", value: stats.total, icon: Award, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
    { label: "Active", value: stats.active, icon: ShieldCheck, gradient: "from-success/10 to-success/5", iconColor: "text-success" },
    { label: "Expired", value: stats.expired, icon: Clock, gradient: "from-warning/10 to-warning/5", iconColor: "text-warning" },
    { label: "Revoked", value: stats.revoked, icon: ShieldX, gradient: "from-destructive/10 to-destructive/5", iconColor: "text-destructive" },
    { label: "Total Views", value: totalViews, icon: Eye, gradient: "from-secondary/10 to-secondary/5", iconColor: "text-secondary" },
  ];

  return (
    <LearnerLayout>
      <div className="mx-auto max-w-6xl animate-fade-in">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground">Here are your earned badges</p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 stagger-children">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${s.gradient} p-4 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-5 w-5 ${s.iconColor} transition-transform group-hover:scale-110`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search badges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Badges</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-16 text-center animate-fade-in">
            <div className="rounded-2xl bg-muted/50 p-6">
              <Award className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <p className="mt-6 text-lg font-semibold text-foreground">
              {search || filter !== "all" ? "No badges match your filters" : "No badges earned yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || filter !== "all"
                ? "Try adjusting your search or filter"
                : "Badges you earn will appear here"}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 stagger-children">
            {filtered.map((a) => (
              <BadgeCard key={a.id} assertion={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-2 stagger-children">
            {filtered.map((a) => {
              const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
              const status = a.revoked ? "revoked" : isExpired ? "expired" : "active";
              return (
                <div
                  key={a.id}
                  className="flex cursor-pointer items-center gap-4 rounded-xl border border-border/60 bg-card p-3 transition-all duration-200 hover:shadow-card hover:border-primary/20"
                  onClick={() => setSelected(a)}
                >
                  {a.badge_class.image_url ? (
                    <img
                      src={a.badge_class.image_url}
                      alt={a.badge_class.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{a.badge_class.name}</p>
                    <p className="text-xs text-muted-foreground">{a.badge_class.issuer.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      status === "active"
                        ? "bg-success/10 text-success"
                        : status === "expired"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BadgeDetailModal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        assertion={selected}
      />
    </LearnerLayout>
  );
}
