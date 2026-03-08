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
import { Plus, Pencil, Trash2, Award, Tags } from "lucide-react";
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ["badge_classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_classes").select("*, issuers(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: issuanceCounts = {} } = useQuery({
    queryKey: ["badge-issuance-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assertions").select("badge_class_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const a of data ?? []) counts[a.badge_class_id] = (counts[a.badge_class_id] || 0) + 1;
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

  const { data: categories = [] } = useQuery({
    queryKey: ["badge_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: badgeCategoryLinks = [] } = useQuery({
    queryKey: ["badge_class_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("badge_class_categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Map badge_id -> category names
  const badgeCatMap: Record<string, string[]> = {};
  for (const link of badgeCategoryLinks) {
    const cat = categories.find((c) => c.id === link.category_id);
    if (cat) {
      badgeCatMap[link.badge_class_id] = badgeCatMap[link.badge_class_id] || [];
      badgeCatMap[link.badge_class_id].push(cat.name);
    }
  }

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

      let badgeId: string;
      if (editing) {
        const { error } = await supabase.from("badge_classes").update(payload).eq("id", editing.id);
        if (error) throw error;
        badgeId = editing.id;
      } else {
        const { data, error } = await supabase.from("badge_classes").insert(payload).select("id").single();
        if (error) throw error;
        badgeId = data.id;
      }

      // Update categories
      await supabase.from("badge_class_categories").delete().eq("badge_class_id", badgeId);
      if (selectedCategories.length > 0) {
        await supabase.from("badge_class_categories").insert(
          selectedCategories.map((catId) => ({ badge_class_id: badgeId, category_id: catId }))
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badge_classes"] });
      qc.invalidateQueries({ queryKey: ["badge_class_categories"] });
      setDialogOpen(false);
      toast({ title: editing ? "Badge updated" : "Badge created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("badge_classes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["badge_classes"] }); setDeleteId(null); toast({ title: "Badge deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createCatMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("badge_categories").insert({ name: newCatName, color: newCatColor }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["badge_categories"] });
      setSelectedCategories([...selectedCategories, data.id]);
      setNewCatName("");
      setCatDialogOpen(false);
      toast({ title: "Category created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setSelectedCategories([]);
    setDialogOpen(true);
  };

  const openEdit = (b: BadgeClass) => {
    setEditing(b);
    setForm({ name: b.name, description: b.description ?? "", criteria: b.criteria ?? "", issuer_id: b.issuer_id, expiry_days: b.expiry_days?.toString() ?? "" });
    setImageFile(null);
    const linked = badgeCategoryLinks.filter((l) => l.badge_class_id === b.id).map((l) => l.category_id);
    setSelectedCategories(linked);
    setDialogOpen(true);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]);
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
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Issuer</TableHead>
                <TableHead className="hidden md:table-cell">Categories</TableHead>
                <TableHead className="hidden md:table-cell">Expiry</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : badges.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No badges yet.</TableCell></TableRow>
              ) : badges.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.image_url ? <img src={b.image_url} alt="" className="h-10 w-10 rounded object-contain" /> : <Award className="h-10 w-10 text-muted-foreground" />}</TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{b.issuers?.name ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(badgeCatMap[b.id] || []).map((name) => (
                        <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
                      ))}
                      {!(badgeCatMap[b.id]?.length) && <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </TableCell>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Categories</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setCatDialogOpen(true)}>
                  <Plus className="h-3 w-3" /> New Category
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                {categories.length === 0 && <p className="text-xs text-muted-foreground">No categories yet</p>}
              </div>
            </div>
            <div><Label>Expiry (days)</Label><Input type="number" value={form.expiry_days} onChange={(e) => setForm({ ...form, expiry_days: e.target.value })} placeholder="Leave empty for no expiry" /></div>
            <div><Label>Badge Image</Label><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /></div>
            <DialogFooter><Button type="submit" disabled={saveMutation.isPending || !form.issuer_id}>{saveMutation.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createCatMutation.mutate(); }} className="space-y-4">
            <div><Label>Name *</Label><Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required /></div>
            <div><Label>Color</Label><Input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="h-10 w-20" /></div>
            <DialogFooter><Button type="submit" disabled={createCatMutation.isPending || !newCatName.trim()}>{createCatMutation.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
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
