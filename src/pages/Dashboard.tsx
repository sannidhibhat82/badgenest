import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import LearnerLayout from "@/layouts/LearnerLayout";
import BadgeCard from "@/components/BadgeCard";
import BadgeDetailModal from "@/components/BadgeDetailModal";
import { Award, Search, LayoutGrid, List, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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

      // Fetch badge classes + issuers for each assertion
      const badgeClassIds = [...new Set(data.map((a) => a.badge_class_id))];
      const { data: badges } = await supabase
        .from("badge_classes")
        .select("id, name, description, image_url, criteria, issuer_id")
        .in("id", badgeClassIds);

      const issuerIds = [...new Set((badges ?? []).map((b) => b.issuer_id))];
      const { data: issuers } = await supabase
        .from("issuers")
        .select("id, name, logo_url")
        .in("id", issuerIds);

      const issuerMap = Object.fromEntries((issuers ?? []).map((i) => [i.id, i]));
      const badgeMap = Object.fromEntries(
        (badges ?? []).map((b) => [
          b.id,
          { ...b, issuer: issuerMap[b.issuer_id] ?? { name: "Unknown", logo_url: null } },
        ])
      );

      return data.map((a) => ({
        ...a,
        badge_class: badgeMap[a.badge_class_id] ?? {
          id: a.badge_class_id,
          name: "Unknown Badge",
          description: null,
          image_url: null,
          criteria: null,
          issuer: { name: "Unknown", logo_url: null },
        },
      })) as BadgeAssertion[];
    },
    enabled: !!user,
  });

  const filtered = (assertions ?? []).filter((a) => {
    if (search && !a.badge_class.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active") return !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date());
    if (filter === "expired") return !a.revoked && a.expires_at && new Date(a.expires_at) < new Date();
    if (filter === "revoked") return a.revoked;
    return true;
  });

  const stats = {
    total: (assertions ?? []).length,
    active: (assertions ?? []).filter((a) => !a.revoked && !(a.expires_at && new Date(a.expires_at) < new Date())).length,
    expired: (assertions ?? []).filter((a) => !a.revoked && a.expires_at && new Date(a.expires_at) < new Date()).length,
    revoked: (assertions ?? []).filter((a) => a.revoked).length,
  };

  return (
    <LearnerLayout>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here are your earned badges</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total, color: "bg-primary/10 text-primary" },
            { label: "Active", value: stats.active, color: "bg-green-100 text-green-700" },
            { label: "Expired", value: stats.expired, color: "bg-amber-100 text-amber-700" },
            { label: "Revoked", value: stats.revoked, color: "bg-red-100 text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
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
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Badges</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border">
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
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
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              {search || filter !== "all" ? "No badges match your filters" : "No badges earned yet"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {search || filter !== "all"
                ? "Try adjusting your search or filter"
                : "Badges you earn will appear here"}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((a) => (
              <BadgeCard key={a.id} assertion={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {filtered.map((a) => {
              const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
              const status = a.revoked ? "revoked" : isExpired ? "expired" : "active";
              return (
                <div
                  key={a.id}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
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
                    <p className="font-medium truncate">{a.badge_class.name}</p>
                    <p className="text-xs text-muted-foreground">{a.badge_class.issuer.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      status === "active"
                        ? "bg-green-100 text-green-700"
                        : status === "expired"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
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
