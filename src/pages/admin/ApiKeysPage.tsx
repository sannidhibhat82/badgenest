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
import { toast } from "@/hooks/use-toast";
import { Plus, Copy, Key, Trash2 } from "lucide-react";
import { format } from "date-fns";

const ALL_PERMISSIONS = [
  { value: "badge.issue", label: "Issue badges" },
  { value: "badge.revoke", label: "Revoke badges" },
  { value: "badge.list", label: "List badges" },
  { value: "assertion.list", label: "List assertions" },
];

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "evl_";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", permissions: ["badge.issue", "badge.revoke", "badge.list", "assertion.list"] });

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const keyPrefix = rawKey.slice(0, 8);

      const { error } = await supabase.from("api_keys").insert({
        name: form.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        created_by: user!.id,
        permissions: form.permissions,
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (key) => {
      setNewKey(key);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      toast({ title: "API key created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api_keys"] });
      setRevokeId(null);
      toast({ title: "API key revoked" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePermission = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const baseUrl = `${window.location.origin.replace('id-preview--', '').replace('.lovable.app', '.supabase.co')}/functions/v1/public-api`;
  const apiBaseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-api`;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="mt-1 text-muted-foreground">Manage API keys for programmatic badge issuance</p>
        </div>
        <Button onClick={() => { setForm({ name: "", permissions: ["badge.issue", "badge.revoke", "badge.list", "assertion.list"] }); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Create API Key
        </Button>
      </div>

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">API Reference</CardTitle>
          <CardDescription>Use these endpoints to integrate with external systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-2">
            <p className="text-muted-foreground"># Base URL</p>
            <p className="break-all">{apiBaseUrl}</p>
            <p className="mt-3 text-muted-foreground"># Authentication — include X-API-Key header</p>
            <p>X-API-Key: evl_your_api_key_here</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { method: "GET", path: "/badges", desc: "List all badge classes", perm: "badge.list" },
              { method: "GET", path: "/assertions?limit=50&offset=0", desc: "List assertions (paginated)", perm: "assertion.list" },
              { method: "POST", path: "/assertions", desc: 'Issue badge: {"recipient_email", "badge_class_id", "evidence_url?"}', perm: "badge.issue" },
              { method: "POST", path: "/assertions/:id/revoke", desc: 'Revoke: {"reason?"}', perm: "badge.revoke" },
            ].map((ep) => (
              <div key={ep.path + ep.method} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="font-mono text-xs">{ep.method}</Badge>
                  <code className="text-sm break-all">{ep.path}</code>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ep.desc}</p>
                <Badge variant="outline" className="mt-1 text-xs">{ep.perm}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keys Table */}
      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="hidden md:table-cell">Last Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No API keys yet.</TableCell></TableRow>
              ) : apiKeys.map((k: any) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-sm">{k.key_prefix}…</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(k.permissions as string[]).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {k.last_used_at ? format(new Date(k.last_used_at), "MMM d, yyyy HH:mm") : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.revoked ? "destructive" : "default"}>
                      {k.revoked ? "Revoked" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!k.revoked && (
                      <Button variant="ghost" size="icon" onClick={() => setRevokeId(k.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
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
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Generate a key for programmatic access to the badge API.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. LMS Integration" required />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="mt-2 space-y-2">
                {ALL_PERMISSIONS.map((p) => (
                  <div key={p.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.permissions.includes(p.value)}
                      onCheckedChange={() => togglePermission(p.value)}
                    />
                    <span className="text-sm">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || !form.name.trim() || form.permissions.length === 0}>
                {createMutation.isPending ? "Creating…" : "Create Key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Show New Key */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Your API Key</DialogTitle>
            <DialogDescription>Copy this key now. It will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 font-mono text-sm break-all select-all">{newKey}</div>
          <DialogFooter>
            <Button onClick={() => { navigator.clipboard.writeText(newKey || ""); toast({ title: "Copied!" }); }}>
              <Copy className="mr-2 h-4 w-4" />Copy Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>This key will immediately stop working. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revokeId && revokeMutation.mutate(revokeId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
