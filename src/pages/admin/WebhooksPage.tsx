import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Webhook, Copy } from "lucide-react";
import { format } from "date-fns";

const WEBHOOK_EVENTS = [
  { value: "badge.issued", label: "Badge Issued" },
  { value: "badge.revoked", label: "Badge Revoked" },
];

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function WebhooksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ url: "", events: ["badge.issued", "badge.revoked"] });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const secret = generateSecret();
      const { data, error } = await supabase.from("webhooks").insert({
        url: form.url,
        secret,
        events: form.events,
        created_by: user!.id,
      }).select("secret").single();
      if (error) throw error;
      return data.secret;
    },
    onSuccess: (secret) => {
      navigator.clipboard.writeText(secret);
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setCreateOpen(false);
      toast({ title: "Webhook created!", description: "Signing secret copied to clipboard." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhooks").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteId(null);
      toast({ title: "Webhook deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="mt-1 text-muted-foreground">Get notified when badge events occur</p>
        </div>
        <Button onClick={() => { setForm({ url: "", events: ["badge.issued", "badge.revoked"] }); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Webhook
        </Button>
      </div>

      {/* How it works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Webhook className="h-5 w-5" />How Webhooks Work</CardTitle>
          <CardDescription>Your endpoint receives a POST with a JSON payload signed using HMAC-SHA256.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-1">
            <p className="text-muted-foreground">// POST payload</p>
            <p>{'{'}</p>
            <p className="pl-4">"event": "badge.issued",</p>
            <p className="pl-4">"data": {'{'} "assertion_id": "…", "recipient_email": "…", "badge_class_id": "…" {'}'},</p>
            <p className="pl-4">"timestamp": "2026-03-08T…"</p>
            <p>{'}'}</p>
            <p className="mt-2 text-muted-foreground">// Verify via X-Webhook-Signature header (HMAC-SHA256 of body using your secret)</p>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Table */}
      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead className="hidden md:table-cell">Last Triggered</TableHead>
                <TableHead className="hidden md:table-cell">Failures</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : webhooks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No webhooks configured.</TableCell></TableRow>
              ) : webhooks.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">{w.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(w.events as string[]).map((e: string) => (
                        <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {w.last_triggered_at ? format(new Date(w.last_triggered_at), "MMM d, HH:mm") : "Never"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {w.failure_count > 0 ? (
                      <Badge variant="destructive">{w.failure_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={w.active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: w.id, active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(w.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>We'll send a POST request to this URL when events occur.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Endpoint URL *</Label>
              <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-server.com/webhooks/badges" required />
            </div>
            <div>
              <Label>Events</Label>
              <div className="mt-2 space-y-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.events.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                    />
                    <span className="text-sm">{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || !form.url.trim() || form.events.length === 0}>
                {createMutation.isPending ? "Creating…" : "Create Webhook"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>This webhook will stop receiving events immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
