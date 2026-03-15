import { useQuery } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  "assertion.create": { label: "Assertion Created", icon: Award, color: "bg-green-100 text-green-700" },
  "assertion.update": { label: "Assertion Updated", icon: Edit, color: "bg-amber-100 text-amber-700" },
  "assertion.delete": { label: "Assertion Deleted", icon: Trash2, color: "bg-red-100 text-red-700" },
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(0);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => adminApi.auditLogs(),
  });

  const filtered = (logs as any[]).filter((l: any) => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      const actorName = (l.actor_name ?? "").toLowerCase();
      const details = JSON.stringify(l.details ?? {}).toLowerCase();
      if (!actorName.includes(q) && !details.includes(q)) return false;
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs.</TableCell></TableRow>
              ) : (
                paginated.map((l: any) => {
                  const config = ACTION_CONFIG[l.action] ?? { label: l.action, icon: FileText, color: "bg-muted text-muted-foreground" };
                  const Icon = config.icon;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(l.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>{l.actor_name ?? l.actor_id}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${config.color}`}>
                          <Icon className="h-3 w-3" />{config.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{l.entity_type} {l.entity_id ? `(${String(l.entity_id).slice(0, 8)}…)` : ""}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
