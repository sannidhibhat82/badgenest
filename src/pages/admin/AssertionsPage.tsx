import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Upload, ShieldCheck, ShieldX, ShieldAlert, Search, Trash2, ChevronLeft, ChevronRight, Send, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { logAuditAction } from "@/lib/audit";

const PAGE_SIZE = 20;

export default function AssertionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [form, setForm] = useState({ recipient_id: "", badge_class_id: "", evidence_url: "", email: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBadgeId, setCsvBadgeId] = useState("");
  const [filterBadge, setFilterBadge] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [issueMode, setIssueMode] = useState<"select" | "email">("select");

  // Revocation
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; currentRevoked: boolean } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", badge_class_id: "", evidence_url: "" });

  const { data: assertions = [], isLoading } = useQuery({
    queryKey: ["assertions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assertions")
        .select("*, badge_classes(name, image_url, expiry_days)")
        .order("issued_at", { ascending: false });
      if (error) throw error;

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
      const { data, error } = await supabase.from("badge_classes").select("id, name, expiry_days").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: learners = [] } = useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Issue mutation with email support
  const issueMutation = useMutation({
    mutationFn: async () => {
      let recipientId = form.recipient_id;

      if (issueMode === "email" && form.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", form.email.trim().toLowerCase())
          .maybeSingle();
        if (!profile) throw new Error(`No learner found with email: ${form.email}`);
        recipientId = profile.user_id;
      }

      if (!recipientId) throw new Error("Please select a learner or enter an email");

      // Auto-calculate expires_at from badge_class.expiry_days
      const selectedBadge = badges.find((b) => b.id === form.badge_class_id);
      let expiresAt: string | null = null;
      if (selectedBadge?.expiry_days) {
        const d = new Date();
        d.setDate(d.getDate() + selectedBadge.expiry_days);
        expiresAt = d.toISOString();
      }

      const { data: inserted, error } = await supabase.from("assertions").insert({
        recipient_id: recipientId,
        badge_class_id: form.badge_class_id,
        evidence_url: form.evidence_url || null,
        expires_at: expiresAt,
      }).select("id").single();
      if (error) throw error;

      // Sign assertion (snapshot + HMAC signature)
      try {
        await supabase.functions.invoke("sign-assertion", {
          body: { assertion_id: inserted.id },
        });
      } catch (signErr) {
        console.error("Signing failed:", signErr);
      }

      // Audit log
      const badgeName = badges.find((b) => b.id === form.badge_class_id)?.name || "Badge";
      const learner = learners.find((l) => l.user_id === recipientId);
      await logAuditAction("badge.issued", "assertion", inserted.id, {
        badge_name: badgeName,
        learner_name: learner?.full_name,
        learner_email: learner?.email || form.email,
      });

      // Send notification
      try {
        await supabase.functions.invoke("send-badge-notification", {
          body: { recipientId, badgeName, evidenceUrl: form.evidence_url || null },
        });
      } catch (notifErr) {
        console.error("Notification failed:", notifErr);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assertions"] }); setIssueOpen(false); toast({ title: "Badge issued & learner notified" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // CSV with email support
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile || !csvBadgeId) throw new Error("Select a badge and CSV file");
      const text = await csvFile.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const header = lines[0].toLowerCase().split(",");
      const emailIdx = header.indexOf("email");
      const uidIdx = header.indexOf("user_id");
      const evIdx = header.indexOf("evidence_url");

      if (emailIdx === -1 && uidIdx === -1) throw new Error("CSV must have 'email' or 'user_id' column");

      const rows = lines.slice(1);
      let inserted = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const cols = row.split(",").map((c) => c.trim());
        let recipientId = uidIdx !== -1 ? cols[uidIdx] : null;

        if (!recipientId && emailIdx !== -1) {
          const email = cols[emailIdx]?.toLowerCase();
          if (!email) continue;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("email", email)
            .maybeSingle();
          if (!profile) {
            errors.push(email);
            continue;
          }
          recipientId = profile.user_id;
        }

        if (!recipientId) continue;

        const evidence = evIdx !== -1 ? cols[evIdx] || null : null;
        const csvBadge = badges.find((b) => b.id === csvBadgeId);
        let csvExpiresAt: string | null = null;
        if (csvBadge?.expiry_days) {
          const d = new Date();
          d.setDate(d.getDate() + csvBadge.expiry_days);
          csvExpiresAt = d.toISOString();
        }
        const { error } = await supabase.from("assertions").insert({
          recipient_id: recipientId,
          badge_class_id: csvBadgeId,
          evidence_url: evidence,
          expires_at: csvExpiresAt,
        });
        if (!error) {
          // Get the inserted assertion id for signing
          const { data: justInserted } = await supabase
            .from("assertions")
            .select("id")
            .eq("recipient_id", recipientId)
            .eq("badge_class_id", csvBadgeId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (justInserted) {
            supabase.functions.invoke("sign-assertion", {
              body: { assertion_id: justInserted.id },
            }).catch(console.error);
          }
          inserted++;
          const badgeName = badges.find((b) => b.id === csvBadgeId)?.name || "Badge";
          supabase.functions.invoke("send-badge-notification", {
            body: { recipientId, badgeName, evidenceUrl: evidence },
          }).catch(console.error);
        }
      }

      if (errors.length > 0) {
        toast({ title: "Some emails not found", description: errors.join(", "), variant: "destructive" });
      }
      return inserted;
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ["assertions"] }); setCsvOpen(false); toast({ title: `${count} badge(s) issued via CSV` }); },
    onError: (e: Error) => toast({ title: "CSV Error", description: e.message, variant: "destructive" }),
  });

  // Revoke with reason + audit
  const toggleRevoke = useMutation({
    mutationFn: async ({ id, revoked, reason }: { id: string; revoked: boolean; reason: string }) => {
      const { error } = await supabase.from("assertions").update({
        revoked,
        revocation_reason: revoked ? (reason || "Revoked by admin") : null,
      }).eq("id", id);
      if (error) throw error;

      const assertion = assertions.find((a: any) => a.id === id);
      await logAuditAction(revoked ? "badge.revoked" : "badge.restored", "assertion", id, {
        badge_name: assertion?.badge_classes?.name,
        learner_name: assertion?.profile?.full_name,
        reason: revoked ? reason : undefined,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assertions"] }); setRevokeTarget(null); setRevokeReason(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete + audit
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const assertion = assertions.find((a: any) => a.id === id);
      const { error } = await supabase.from("assertions").delete().eq("id", id);
      if (error) throw error;
      await logAuditAction("badge.deleted", "assertion", id, {
        badge_name: assertion?.badge_classes?.name,
        learner_name: assertion?.profile?.full_name,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assertions"] }); setDeleteId(null); toast({ title: "Assertion deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteForm.email || !inviteForm.badge_class_id) throw new Error("Email and badge are required");

      const { data, error } = await supabase.from("badge_invites").insert({
        email: inviteForm.email.trim().toLowerCase(),
        badge_class_id: inviteForm.badge_class_id,
        evidence_url: inviteForm.evidence_url || null,
        invited_by: user!.id,
      }).select("invite_token").single();
      if (error) throw error;

      const badgeName = badges.find((b) => b.id === inviteForm.badge_class_id)?.name || "Badge";
      await logAuditAction("invite.sent", "badge_invite", null, {
        email: inviteForm.email,
        badge_name: badgeName,
      });

      return data;
    },
    onSuccess: (data) => {
      const claimUrl = `${window.location.origin}/claim/${data.invite_token}`;
      navigator.clipboard.writeText(claimUrl);
      qc.invalidateQueries({ queryKey: ["assertions"] });
      setInviteOpen(false);
      toast({ title: "Invite created! Link copied to clipboard.", description: claimUrl });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Bulk sign unsigned assertions
  const bulkSignMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("bulk-sign-assertions");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["assertions"] });
      toast({
        title: `Signed ${data.signed} of ${data.total} assertion(s)`,
        description: data.errors ? `${data.errors.length} error(s)` : "All assertions signed successfully",
      });
    },
    onError: (e: Error) => toast({ title: "Bulk sign failed", description: e.message, variant: "destructive" }),
  });

  const getStatus = (a: any) => {
    if (a.revoked) return { label: "Revoked", variant: "destructive" as const, icon: ShieldX };
    if (a.expires_at && new Date(a.expires_at) < new Date()) return { label: "Expired", variant: "secondary" as const, icon: ShieldAlert };
    return { label: "Valid", variant: "default" as const, icon: ShieldCheck };
  };

  // Filter + search
  const filtered = assertions.filter((a: any) => {
    if (filterBadge !== "all" && a.badge_class_id !== filterBadge) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = a.profile?.full_name?.toLowerCase() || "";
      const email = a.profile?.email?.toLowerCase() || "";
      const badge = a.badge_classes?.name?.toLowerCase() || "";
      if (!name.includes(q) && !email.includes(q) && !badge.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assertions</h1>
          <p className="mt-1 text-muted-foreground">Manage issued badges</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => bulkSignMutation.mutate()} disabled={bulkSignMutation.isPending}>
            <KeyRound className="mr-2 h-4 w-4" />{bulkSignMutation.isPending ? "Signing…" : "Sign All"}
          </Button>
          <Button variant="outline" onClick={() => { setInviteForm({ email: "", badge_class_id: "", evidence_url: "" }); setInviteOpen(true); }}><Send className="mr-2 h-4 w-4" />Send Invite</Button>
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />CSV Import</Button>
          <Button onClick={() => { setForm({ recipient_id: "", badge_class_id: "", evidence_url: "", email: "" }); setIssueMode("select"); setIssueOpen(true); }}><Plus className="mr-2 h-4 w-4" />Issue Badge</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or badge…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={filterBadge} onValueChange={(v) => { setFilterBadge(v); setPage(0); }}>
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
                <TableHead>Email</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead className="hidden md:table-cell">Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assertions found.</TableCell></TableRow>
              ) : paginated.map((a: any) => {
                const status = getStatus(a);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.profile?.full_name || a.recipient_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.profile?.email || "—"}</TableCell>
                    <TableCell>{a.badge_classes?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{format(new Date(a.issued_at), "MMM d, yyyy")}</TableCell>
                    <TableCell><Badge variant={status.variant}><status.icon className="mr-1 h-3 w-3" />{status.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={a.revoked ? "text-success" : "text-destructive"}
                          onClick={() => {
                            if (a.revoked) {
                              toggleRevoke.mutate({ id: a.id, revoked: false, reason: "" });
                            } else {
                              setRevokeTarget({ id: a.id, currentRevoked: false });
                              setRevokeReason("");
                            }
                          }}
                        >
                          {a.revoked ? "Restore" : "Revoke"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
          <p className="text-sm text-muted-foreground">{filtered.length} result(s) — Page {page + 1} of {totalPages}</p>
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

      {/* Revoke Confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke Badge</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to revoke this badge? This action can be undone later.</p>
          <div>
            <Label>Reason for revocation *</Label>
            <Textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="e.g. Fraudulent submission, policy violation…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!revokeReason.trim() || toggleRevoke.isPending}
              onClick={() => revokeTarget && toggleRevoke.mutate({ id: revokeTarget.id, revoked: true, reason: revokeReason })}
            >
              {toggleRevoke.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assertion?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this assertion. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Issue Badge */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Badge</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); issueMutation.mutate(); }} className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={issueMode === "select" ? "default" : "outline"} size="sm" onClick={() => setIssueMode("select")}>Select Learner</Button>
              <Button type="button" variant={issueMode === "email" ? "default" : "outline"} size="sm" onClick={() => setIssueMode("email")}>By Email</Button>
            </div>
            {issueMode === "select" ? (
              <div>
                <Label>Learner *</Label>
                <Select value={form.recipient_id} onValueChange={(v) => setForm({ ...form, recipient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                  <SelectContent>{learners.map((l) => <SelectItem key={l.user_id} value={l.user_id}>{l.full_name || l.email || l.user_id.slice(0, 8)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Learner Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="learner@example.com" />
              </div>
            )}
            <div>
              <Label>Badge *</Label>
              <Select value={form.badge_class_id} onValueChange={(v) => setForm({ ...form, badge_class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                <SelectContent>{badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Evidence URL</Label><Input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://…" /></div>
            <DialogFooter>
              <Button type="submit" disabled={issueMutation.isPending || !form.badge_class_id || (issueMode === "select" ? !form.recipient_id : !form.email)}>
                {issueMutation.isPending ? "Issuing…" : "Issue"}
              </Button>
            </DialogFooter>
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
              <p className="mt-1 text-xs text-muted-foreground">Columns: email (or user_id), evidence_url (optional)</p>
            </div>
            <DialogFooter><Button type="submit" disabled={csvMutation.isPending || !csvBadgeId || !csvFile}>{csvMutation.isPending ? "Importing…" : "Import"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Invite */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Badge Invite</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Send a claim link to someone who doesn't have an account yet. They'll sign up and claim the badge.</p>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
            <div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="recipient@example.com" required /></div>
            <div>
              <Label>Badge *</Label>
              <Select value={inviteForm.badge_class_id} onValueChange={(v) => setInviteForm({ ...inviteForm, badge_class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                <SelectContent>{badges.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Evidence URL</Label><Input value={inviteForm.evidence_url} onChange={(e) => setInviteForm({ ...inviteForm, evidence_url: e.target.value })} placeholder="https://…" /></div>
            <DialogFooter>
              <Button type="submit" disabled={inviteMutation.isPending || !inviteForm.email || !inviteForm.badge_class_id}>
                {inviteMutation.isPending ? "Sending…" : "Create Invite Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
