import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin as adminApi, data as dataApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, ShieldCheck, ShieldX } from "lucide-react";
import { format } from "date-fns";

export default function AssertionsPage() {
  const qc = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; revoked: boolean } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ recipient_id: "", badge_class_id: "", evidence_url: "" });

  const { data: assertions = [], isLoading } = useQuery({
    queryKey: ["admin-assertions"],
    queryFn: () => adminApi.assertions(),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["badge_classes"],
    queryFn: () => dataApi.badgeClasses(),
  });

  const { data: learners = [] } = useQuery({
    queryKey: ["learners"],
    queryFn: () => adminApi.learners(),
  });

  const issueMutation = useMutation({
    mutationFn: () => dataApi.createAssertion({
      recipient_id: form.recipient_id,
      badge_class_id: form.badge_class_id,
      evidence_url: form.evidence_url || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assertions"] });
      setIssueOpen(false);
      setForm({ recipient_id: "", badge_class_id: "", evidence_url: "" });
      toast({ title: "Badge issued" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, revoked, reason }: { id: string; revoked: boolean; reason?: string }) =>
      adminApi.assertionUpdate(id, { revoked, revocation_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assertions"] });
      setRevokeTarget(null);
      setRevokeReason("");
      toast({ title: "Assertion updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.assertionDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assertions"] });
      setDeleteId(null);
      toast({ title: "Assertion deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assertions</h1>
          <p className="mt-1 text-muted-foreground">Issue and manage badge assertions</p>
        </div>
        <Button onClick={() => setIssueOpen(true)}><Plus className="mr-2 h-4 w-4" />Issue Badge</Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : assertions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assertions yet.</TableCell></TableRow>
              ) : (
                (assertions as any[]).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.recipient_name ?? a.recipient_email ?? a.recipient_id}</TableCell>
                    <TableCell>{a.badge_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(a.issued_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{a.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setRevokeTarget({ id: a.id, revoked: !a.revoked })}>
                        {a.revoked ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Badge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Learner</Label>
              <Select value={form.recipient_id} onValueChange={v => setForm(f => ({ ...f, recipient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>
                  {(learners as any[]).map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Badge</Label>
              <Select value={form.badge_class_id} onValueChange={v => setForm(f => ({ ...f, badge_class_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
                <SelectContent>
                  {(badges as any[]).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidence URL (optional)</Label>
              <Input value={form.evidence_url} onChange={e => setForm(f => ({ ...f, evidence_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending || !form.recipient_id || !form.badge_class_id}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && (setRevokeTarget(null), setRevokeReason(""))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{revokeTarget?.revoked ? "Restore" : "Revoke"} assertion?</AlertDialogTitle>
            <AlertDialogDescription>Optionally provide a reason (for revoke).</AlertDialogDescription>
          </AlertDialogHeader>
          {revokeTarget && !revokeTarget.revoked && (
            <div>
              <Label>Reason</Label>
              <Textarea value={revokeReason} onChange={e => setRevokeReason(e.target.value)} placeholder="Optional" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeTarget && revokeMutation.mutate({ id: revokeTarget.id, revoked: !revokeTarget.revoked, reason: revokeReason })}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assertion?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
