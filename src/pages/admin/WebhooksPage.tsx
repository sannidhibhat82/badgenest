import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ url: "" });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => adminApi.webhooks(),
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createWebhook({ url: form.url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setDialogOpen(false);
      setForm({ url: "" });
      toast({ title: "Webhook created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminApi.updateWebhook(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteWebhook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteId(null);
      toast({ title: "Webhook deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="mt-1 text-muted-foreground">Notify external URLs when events occur</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Webhook</Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : webhooks.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No webhooks yet.</TableCell></TableRow>
              ) : (
                (webhooks as any[]).map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate">{w.url}</TableCell>
                    <TableCell>
                      <Switch checked={!!w.active} onCheckedChange={checked => updateMutation.mutate({ id: w.id, active: !!checked })} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(w.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div>
            <Label>URL</Label>
            <Input value={form.url} onChange={e => setForm({ url: e.target.value })} placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.url.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
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
