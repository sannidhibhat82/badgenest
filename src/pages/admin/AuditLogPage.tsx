import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, FileText, Shield, Award, Trash2, UserPlus, Edit, Send } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const PAGE_SIZE = 25;

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  "badge.issued": { label: "Badge Issued", icon: Award, color: "bg-green-100 text-green-700" },
  "badge.revoked": { label: "Badge Revoked", icon: Shield, color: "bg-red-100 text-red-700" },
  "badge.restored": { label: "Badge Restored", icon: Shield, color: "bg-blue-100 text-blue-700" },
  "badge.deleted": { label: "Assertion Deleted", icon: Trash2, color: "bg-red-100 text-red-700" },
  "badge_class.created": { label: "Badge Created", icon: Award, color: "bg-green-100 text-green-700" },
  "badge_class.updated": { label: "Badge Updated", icon: Edit, color: "bg-amber-100 text-amber-700" },
  "badge_class.deleted": { label: "Badge Deleted", icon: Trash2, color: "bg-red-100 text-red-700" },
  "invite.sent": { label: "Invite Sent", icon: Send, color: "bg-blue-100 text-blue-700" },
  "invite.claimed": { label: "Invite Claimed", icon: UserPlus, color: "bg-green-100 text-green-700" },
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(0);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      // Fetch actor profiles
      const actorIds = [...new Set(data.map((l: any) => l.actor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", actorIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((l: any) => ({
        ...l,
        actor: profileMap[l.actor_id] ?? null,
      }));
    },
  });

  const filtered = logs.filter((l: any) => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      const actorName = l.actor?.full_name?.toLowerCase() || "";
      const actorEmail = l.actor?.email?.toLowerCase() || "";
      const details = JSON.stringify(l.details).toLowerCase();
      if (!actorName.includes(q) && !actorEmail.includes(q) && !details.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="mt-1 text-muted-foreground">Track all admin actions on the platform</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by admin or details…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                  No audit logs found
                </TableCell></TableRow>
              ) : paginated.map((l: any) => {
                const cfg = ACTION_CONFIG[l.action] || { label: l.action, icon: FileText, color: "bg-muted text-muted-foreground" };
                const Icon = cfg.icon;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {l.actor?.full_name || l.actor?.email || l.actor_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${cfg.color} border-0 text-xs`}>
                        <Icon className="mr-1 h-3 w-3" />{cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {l.details?.badge_name && <span>Badge: {l.details.badge_name}</span>}
                      {l.details?.learner_name && <span className="ml-2">• Learner: {l.details.learner_name}</span>}
                      {l.details?.learner_email && <span className="ml-2">• {l.details.learner_email}</span>}
                      {l.details?.reason && <span className="ml-2">• Reason: {l.details.reason}</span>}
                      {l.details?.email && <span>Email: {l.details.email}</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} log(s) — Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Next<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
