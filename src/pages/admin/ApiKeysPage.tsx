import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Copy, Key, Trash2 } from "lucide-react";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "" });

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api_keys"],
    queryFn: () => adminApi.apiKeys(),
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createApiKey(form.name),
    onSuccess: (data) => {
      setNewKey(data.key);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast({ title: "API key created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      setRevokeId(null);
      toast({ title: "API key revoked" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="mt-1 text-muted-foreground">Manage API keys for programmatic badge issuance</p>
        </div>
        <Button onClick={() => { setForm({ name: "" }); setNewKey(null); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Create API Key
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">API Reference</CardTitle>
          <CardDescription>Backend API base: {API_BASE}. Use Bearer token or API key in Authorization header for authenticated routes.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No API keys yet.</TableCell></TableRow>
              ) : (
                (apiKeys as any[]).map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-sm">{k.key_prefix}…</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(k.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>{k.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
                    <TableCell>
                      {!k.revoked && <Button variant="ghost" size="icon" onClick={() => setRevokeId(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Give this key a name. You will see the full key only once.</DialogDescription>
          </DialogHeader>
          {!newKey ? (
            <>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm({ name: e.target.value })} placeholder="e.g. Production" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()}>Create</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <p className="text-sm text-amber-600">Copy this key now. You won&apos;t see it again.</p>
              <div className="flex items-center gap-2">
                <Input value={newKey} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={() => copyKey(newKey)}><Copy className="h-4 w-4" /></Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreateOpen(false); setNewKey(null); }}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeId} onOpenChange={open => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>Existing requests using this key will stop working.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeId && revokeMutation.mutate(revokeId)} className="bg-destructive text-destructive-foreground">Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
