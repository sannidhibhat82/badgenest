import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Upload, ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export default function AssertionsPage() {
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [form, setForm] = useState({ recipient_id: "", badge_class_id: "", evidence_url: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBadgeId, setCsvBadgeId] = useState("");
  const [filterBadge, setFilterBadge] = useState("all");

  const { data: assertions = [], isLoading } = useQuery({
    queryKey: ["assertions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assertions")
        .select("*, badge_classes(name, image_url, expiry_days)")
        .order("issued_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles to get names and emails
      const recipientIds = [...new Set((data ?? []).map((a) => a.recipient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", recipientIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      return (data ?? []).map((a) => ({
        ...a,
        profile: profileMap[a.recipient_id] ?? null,
      }));
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["badge_classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_classes").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: learners = [] } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assertions").insert({
        recipient_id: form.recipient_id,
        badge_class_id: form.badge_class_id,
        evidence_url: form.evidence_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assertions"] }); setIssueOpen(false); toast({ title: "Badge issued" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile || !csvBadgeId) throw new Error("Select a badge and CSV file");
      const text = await csvFile.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      // Expect header: email (or user_id), evidence_url (optional)
      const header = lines[0].toLowerCase().split(",");
      const emailIdx = header.indexOf("email");
      const uidIdx = header.indexOf("user_id");
      const evIdx = header.indexOf("evidence_url");

      if (emailIdx === -1 && uidIdx === -1) throw new Error("CSV must have 'email' or 'user_id' column");

      const rows = lines.slice(1);
      let inserted = 0;

      for (const row of rows) {
        const cols = row.split(",").map((c) => c.trim());
        let recipientId = uidIdx !== -1 ? cols[uidIdx] : null;

        if (!recipientId && emailIdx !== -1) {
          // Look up user by email in profiles — but we don't store email there.
          // We'll match by searching auth metadata isn't accessible, so require user_id.
          // Actually let's look up by profile full_name or skip. Better: require user_id.
          throw new Error("CSV with 'email' column is not yet supported. Please use 'user_id' column.");
        }

        if (!recipientId) continue;

        const evidence = evIdx !== -1 ? cols[evIdx] || null : null;
        const { error } = await supabase.from("assertions").insert({
          recipient_id: recipientId,
          badge_class_id: csvBadgeId,
          evidence_url: evidence,
        });
        if (!error) inserted++;
      }

      return inserted;
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ["assertions"] }); setCsvOpen(false); toast({ title: `${count} badge(s) issued via CSV` }); },
    onError: (e: Error) => toast({ title: "CSV Error", description: e.message, variant: "destructive" }),
  });

  const toggleRevoke = useMutation({
    mutationFn: async ({ id, revoked }: { id: string; revoked: boolean }) => {
      const { error } = await supabase.from("assertions").update({ revoked, revocation_reason: revoked ? "Revoked by admin" : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assertions"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const getStatus = (a: any) => {
    if (a.revoked) return { label: "Revoked", variant: "destructive" as const, icon: ShieldX };
    if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", variant: "secondary" as const, icon: ShieldAlert };
    return { label: "Valid", variant: "default" as const, icon: ShieldCheck };
  };

  const filtered = filterBadge === "all" ? assertions : assertions.filter((a: any) => a.badge_class_id === filterBadge);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assertions</h1>
          <p className="mt-1 text-muted-foreground">Manage issued badges</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />CSV Import</Button>
          <Button onClick={() => { setForm({ recipient_id: "", badge_class_id: "", evidence_url: "" }); setIssueOpen(true); }}><Plus className="mr-2 h-4 w-4" />Issue Badge</Button>
        </div>
      </div>

      <div className="mt-4">
        <Select value={filterBadge} onValueChange={setFilterBadge}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Filter by badge" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Badges</SelectItem>
            {badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead className="hidden md:table-cell">Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Revoked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assertions found.</TableCell></TableRow>
              ) : filtered.map((a: any) => {
                const status = getStatus(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{(a as any).profiles?.full_name || a.recipient_id.slice(0, 8)}</TableCell>
                    <TableCell>{a.badge_classes?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(a.issued_at), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant={status.variant}><status.icon className="mr-1 h-3 w-3" />{status.label}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={a.revoked} onCheckedChange={(v) => toggleRevoke.mutate({ id: a.id, revoked: v })} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Issue single */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Badge</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); issueMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Learner *</Label>
              <Select value={form.recipient_id} onValueChange={(v) => setForm({ ...form, recipient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>{learners.map((l) => <SelectItem key={l.user_id} value={l.user_id}>{l.full_name || l.user_id.slice(0, 8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Badge *</Label>
              <Select value={form.badge_class_id} onValueChange={(v) => setForm({ ...form, badge_class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                <SelectContent>{badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Evidence URL</Label><Input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://…" /></div>
            <DialogFooter><Button type="submit" disabled={issueMutation.isPending || !form.recipient_id || !form.badge_class_id}>{issueMutation.isPending ? "Issuing…" : "Issue"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Issue via CSV</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); csvMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Badge *</Label>
              <Select value={csvBadgeId} onValueChange={setCsvBadgeId}>
                <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                <SelectContent>{badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSV File *</Label>
              <Input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
              <p className="mt-1 text-xs text-muted-foreground">Columns: user_id, evidence_url (optional)</p>
            </div>
            <DialogFooter><Button type="submit" disabled={csvMutation.isPending || !csvBadgeId || !csvFile}>{csvMutation.isPending ? "Importing…" : "Import"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
