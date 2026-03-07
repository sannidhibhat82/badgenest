import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type BadgeClass = Tables<"badge_classes">;
type Issuer = Tables<"issuers">;

const emptyForm = { name: "", description: "", criteria: "", issuer_id: "", expiry_days: "" };

export default function BadgesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BadgeClass | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ["badge_classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_classes").select("*, issuers(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch issuance counts
  const { data: issuanceCounts = {} } = useQuery({
    queryKey: ["badge-issuance-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assertions").select("badge_class_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const a of data ?? []) {
        counts[a.badge_class_id] = (counts[a.badge_class_id] || 0) + 1;
      }
      return counts;
    },
  });

  const { data: issuers = [] } = useQuery({
    queryKey: ["issuers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("issuers").select("id, name").order("name");
      if (error) throw error;
      return data as Pick<Issuer, "id" | "name">[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | null = editing?.image_url ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("badge-images").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("badge-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      const payload = {
        name: form.name,
        description: form.description || null,
        criteria: form.criteria || null,
        issuer_id: form.issuer_id,
        expiry_days: form.expiry_days ? parseInt(form.expiry_days) : null,
        image_url,
      };

      if (editing) {
        const { error } = await supabase.from("badge_classes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("badge_classes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["badge_classes"] }); setDialogOpen(false); toast({ title: editing ? "Badge updated" : "Badge created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("badge_classes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["badge_classes"] }); setDeleteId(null); toast({ title: "Badge deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImageFile(null); setDialogOpen(true); };
  const openEdit = (b: BadgeClass) => {
    setEditing(b);
    setForm({ name: b.name, description: b.description ?? "", criteria: b.criteria ?? "", issuer_id: b.issuer_id, expiry_days: b.expiry_days?.toString() ?? "" });
    setImageFile(null);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Badge Classes</h1>
          <p className="mt-1 text-muted-foreground">Manage your badge templates</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Badge</Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Issuer</TableHead>
                <TableHead className="hidden md:table-cell">Expiry</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : badges.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No badges yet.</TableCell></TableRow>
              ) : badges.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.image_url ? <img src={b.image_url} alt="" className="h-10 w-10 rounded object-contain" /> : <Award className="h-10 w-10 text-muted-foreground" />}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{b.issuers?.name ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{b.expiry_days ? `${b.expiry_days} days` : "Never"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{issuanceCounts[b.id] || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Badge" : "Create Badge"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Criteria</Label><Textarea value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder="What must learners achieve?" /></div>
            <div>
              <Label>Issuer *</Label>
              <Select value={form.issuer_id} onValueChange={(v) => setForm({ ...form, issuer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select issuer" /></SelectTrigger>
                <SelectContent>{issuers.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Expiry (days)</Label><Input type="number" value={form.expiry_days} onChange={(e) => setForm({ ...form, expiry_days: e.target.value })} placeholder="Leave empty for no expiry" /></div>
            <div><Label>Badge Image</Label><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></div>
            <DialogFooter><Button type="submit" disabled={saveMutation.isPending || !form.issuer_id}>{saveMutation.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Badge?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
