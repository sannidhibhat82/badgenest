import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";

export default function LearnersPage() {
  const [search, setSearch] = useState("");

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["admin-learners"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("user_id, full_name, avatar_url").order("full_name");
      if (error) throw error;

      const { data: assertions } = await supabase.from("assertions").select("recipient_id, badge_classes(name), revoked");

      const map = new Map<string, { total: number; active: number; revoked: number; badgeNames: string[] }>();
      for (const a of assertions ?? []) {
        const entry = map.get(a.recipient_id) ?? { total: 0, active: 0, revoked: 0, badgeNames: [] };
        entry.total++;
        if (a.revoked) entry.revoked++;
        else entry.active++;
        if ((a as any).badge_classes?.name) entry.badgeNames.push((a as any).badge_classes.name);
        map.set(a.recipient_id, entry);
      }

      return (profiles ?? []).map((p) => ({
        ...p,
        stats: map.get(p.user_id) ?? { total: 0, active: 0, revoked: 0, badgeNames: [] },
      }));
    },
  });

  const filtered = search
    ? learners.filter((l) =>
        l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.stats.badgeNames.some((n) => n.toLowerCase().includes(search.toLowerCase()))
      )
    : learners;

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Learners</h1>
        <p className="mt-1 text-muted-foreground">View all learners and their badges</p>
      </div>

      <div className="mt-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or badge…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Total Badges</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Revoked</TableHead>
                <TableHead className="hidden md:table-cell">Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No learners found.</TableCell></TableRow>
              ) : filtered.map((l) => {
                const initials = l.full_name ? l.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
                return (
                  <TableRow key={l.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={l.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{l.full_name || "Unnamed"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{l.stats.total}</TableCell>
                    <TableCell>{l.stats.active}</TableCell>
                    <TableCell>{l.stats.revoked}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {l.stats.badgeNames.slice(0, 3).map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}
                        {l.stats.badgeNames.length > 3 && <Badge variant="outline" className="text-xs">+{l.stats.badgeNames.length - 3}</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
