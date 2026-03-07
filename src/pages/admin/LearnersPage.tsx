import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, Tag, Plus, X, Download, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

export default function LearnersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignTagId, setAssignTagId] = useState("");
  const [page, setPage] = useState(0);

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: profileTags = [] } = useQuery({
    queryKey: ["profile_tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_tags").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["admin-learners"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("user_id, full_name, avatar_url, email").order("full_name");
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

  const userTagMap = new Map<string, { id: string; name: string; color: string }[]>();
  for (const pt of profileTags) {
    const tag = tags.find((t) => t.id === pt.tag_id);
    if (!tag) continue;
    const list = userTagMap.get(pt.profile_user_id) ?? [];
    list.push({ id: tag.id, name: tag.name, color: tag.color });
    userTagMap.set(pt.profile_user_id, list);
  }

  const createTag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tags").insert({ name: newTagName.trim(), color: newTagColor });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); setTagDialogOpen(false); setNewTagName(""); toast({ title: "Tag created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignTag = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profile_tags").insert({ profile_user_id: assignUserId, tag_id: assignTagId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile_tags"] }); setAssignOpen(false); toast({ title: "Tag assigned" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeTag = useMutation({
    mutationFn: async ({ userId, tagId }: { userId: string; tagId: string }) => {
      const { error } = await supabase.from("profile_tags").delete().eq("profile_user_id", userId).eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile_tags"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = learners.filter((l) => {
    if (search && !l.full_name?.toLowerCase().includes(search.toLowerCase()) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTag !== "all") {
      const ut = userTagMap.get(l.user_id) ?? [];
      if (!ut.some((t) => t.id === filterTag)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCsv = () => {
    const rows = [["Name", "Email", "Tags", "Total Badges", "Active", "Revoked"]];
    for (const l of filtered) {
      const ut = userTagMap.get(l.user_id) ?? [];
      rows.push([
        l.full_name || "Unnamed",
        l.email || "",
        ut.map((t) => t.name).join("; "),
        String(l.stats.total),
        String(l.stats.active),
        String(l.stats.revoked),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `learners${filterTag !== "all" ? `-tag-${tags.find((t) => t.id === filterTag)?.name}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filtered.length} learner(s)` });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Learners</h1>
          <p className="mt-1 text-muted-foreground">View all learners, manage tags, and export</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTagDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />New Tag
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterTag} onValueChange={(v) => { setFilterTag(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Total Badges</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Revoked</TableHead>
                <TableHead className="hidden md:table-cell">Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No learners found.</TableCell></TableRow>
              ) : paginated.map((l) => {
                const initials = l.full_name ? l.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
                const ut = userTagMap.get(l.user_id) ?? [];
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
                    <TableCell className="text-sm text-muted-foreground">{l.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {ut.map((t) => (
                          <Badge key={t.id} variant="outline" className="text-xs gap-1 pr-1" style={{ borderColor: t.color, color: t.color }}>
                            {t.name}
                            <button onClick={() => removeTag.mutate({ userId: l.user_id, tagId: t.id })} className="hover:opacity-70">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <button
                          onClick={() => { setAssignUserId(l.user_id); setAssignTagId(""); setAssignOpen(true); }}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Tag className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{l.stats.total}</TableCell>
                    <TableCell>{l.stats.active}</TableCell>
                    <TableCell>{l.stats.revoked}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {l.stats.badgeNames.slice(0, 3).map((n: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} learner(s) — Page {page + 1} of {totalPages}</p>
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

      {/* Create Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Tag</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createTag.mutate(); }} className="space-y-4">
            <div>
              <Label>Tag Name *</Label>
              <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="e.g. Batch 2026" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{newTagColor}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createTag.isPending || !newTagName.trim()}>
                {createTag.isPending ? "Creating…" : "Create Tag"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Tag Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Tag</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); assignTag.mutate(); }} className="space-y-4">
            <div>
              <Label>Tag *</Label>
              <Select value={assignTagId} onValueChange={setAssignTagId}>
                <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                <SelectContent>
                  {tags
                    .filter((t) => !(userTagMap.get(assignUserId) ?? []).some((ut) => ut.id === t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={assignTag.isPending || !assignTagId}>
                {assignTag.isPending ? "Assigning…" : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
