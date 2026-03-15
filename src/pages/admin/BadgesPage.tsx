import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { data as dataApi, uploadFile } from "@/lib/api";
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
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import type { BadgeClass, Issuer } from "@/types/db";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
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
    queryFn: () => dataApi.badgeClasses(),
  });

  const { data: issuers = [] } = useQuery({
    queryKey: ["issuers"],
    queryFn: () => dataApi.issuers(),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let image_url: string | null = editing?.image_url ?? null;
      if (imageFile) {
        const { publicUrl } = await uploadFile("badge-images", imageFile);
        image_url = publicUrl.startsWith("http") ? publicUrl : `${API_BASE}${publicUrl}`;
      }
      const payload = {
        name: form.name,
        description: form.description || null,
        criteria: form.criteria || null,
        issuer_id: form.issuer_id,
        expiry_days: form.expiry_days ? parseInt(form.expiry_days, 10) : null,
        image_url,
      };
      if (editing) {
        await dataApi.updateBadgeClass(editing.id, payload);
      } else {
        await dataApi.createBadgeClass(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badge_classes"] });
      setDialogOpen(false);
      toast({ title: editing ? "Badge updated" : "Badge created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dataApi.deleteBadgeClass(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badge_classes"] });
      setDeleteId(null);
      toast({ title: "Badge deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setImageFile(null); setDialogOpen(true); };
  const openEdit = (b: BadgeClass) => { setEditing(b); setForm({ name: b.name, description: b.description ?? "", criteria: b.criteria ?? "", issuer_id: b.issuer_id, expiry_days: b.expiry_days ? String(b.expiry_days) : "" }); setImageFile(null); setDialogOpen(true); };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Badges</h1>
          <p className="mt-1 text-muted-foreground">Manage badge classes</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Badge</Button>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Expiry (days)</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : badges.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No badges yet.</TableCell></TableRow>
              ) : (
                badges.map((b: BadgeClass & { issuer_name?: string }) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {b.image_url ? <img src={b.image_url.startsWith("http") ? b.image_url : `${API_BASE}${b.image_url}`} alt="" className="h-10 w-10 rounded object-contain" /> : <Award className="h-10 w-10 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.issuer_name ?? "—"}</TableCell>
                    <TableCell>{b.expiry_days ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>{editing ? "Edit Badge" : "Add Badge"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Badge name" />
            </div>
            <div>
              <Label>Issuer</Label>
              <Select value={form.issuer_id} onValueChange={v => setForm(f => ({ ...f, issuer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select issuer" /></SelectTrigger>
                <SelectContent>
                  {(issuers as Issuer[]).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <Label>Criteria</Label>
              <Textarea value={form.criteria} onChange={e => setForm(f => ({ ...f, criteria: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <Label>Expiry (days)</Label>
              <Input type="number" value={form.expiry_days} onChange={e => setForm(f => ({ ...f, expiry_days: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <Label>Image</Label>
              <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.issuer_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete badge?</AlertDialogTitle>
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
