import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAuditAction } from "@/lib/audit";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield, ShieldCheck, ShieldAlert, UserPlus, Search, Crown, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  roles: string[];
}

export default function RolesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<UserWithRoles | null>(null);

  // Fetch all profiles + roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string[]>();
      for (const r of roles || []) {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      }

      return (profiles || []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) || ["learner"],
      })) as UserWithRoles[];
    },
  });

  // Promote user to admin
  const promoteMutation = useMutation({
    mutationFn: async (email: string) => {
      // Find user by email
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", email.trim().toLowerCase())
        .single();
      if (pErr || !profile) throw new Error("No user found with that email address");

      // Check if already admin
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "admin")
        .maybeSingle();
      if (existing) throw new Error("User is already an admin");

      // Insert admin role
      const { error: insertErr } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: "admin" as const });
      if (insertErr) throw insertErr;

      await logAuditAction({
        action: "role.promoted",
        entityType: "user_roles",
        entityId: profile.user_id,
        details: { email, role: "admin", promoted_name: profile.full_name },
      });

      return profile;
    },
    onSuccess: (profile) => {
      toast.success(`${profile.full_name || "User"} promoted to admin`);
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setPromoteOpen(false);
      setPromoteEmail("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Demote (remove admin role)
  const demoteMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (targetUserId === user?.id) throw new Error("You cannot remove your own admin role");

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", "admin");
      if (error) throw error;

      await logAuditAction({
        action: "role.demoted",
        entityType: "user_roles",
        entityId: targetUserId,
        details: { role: "admin", action: "removed" },
      });
    },
    onSuccess: () => {
      toast.success("Admin role removed");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setDemoteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const admins = users.filter((u) => u.roles.includes("admin"));
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) ?? false
    );
  });

  const adminCount = admins.length;
  const learnerCount = users.filter((u) => u.roles.includes("learner")).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage admin access and user roles across the platform
            </p>
          </div>
          <Button onClick={() => setPromoteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Admin
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary/10 p-3">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-xs text-muted-foreground">Administrators</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-accent p-3">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{learnerCount}</p>
                <p className="text-xs text-muted-foreground">Learners</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-muted p-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Current Administrators
            </CardTitle>
            <CardDescription>
              Admins can access the admin panel, manage badges, issue assertions, and view all learner data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No administrators found</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {admins.map((admin) => {
                  const initials = admin.full_name
                    ? admin.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
                    : "?";
                  const isSelf = admin.user_id === user?.id;
                  return (
                    <div
                      key={admin.user_id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={admin.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {admin.full_name || "Unnamed"}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      </div>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDemoteTarget(admin)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Users</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const initials = u.full_name
                      ? u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
                      : "?";
                    const isAdmin = u.roles.includes("admin");
                    const isSelf = u.user_id === user?.id;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">
                              {u.full_name || "Unnamed"}
                              {isSelf && (
                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                                  You
                                </Badge>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {u.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={role === "admin" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {role === "admin" && <ShieldCheck className="mr-1 h-3 w-3" />}
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (u.email) {
                                  setPromoteEmail(u.email);
                                  setPromoteOpen(true);
                                }
                              }}
                              className="gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Make Admin
                            </Button>
                          ) : !isSelf ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDemoteTarget(u)}
                              className="gap-1.5 text-destructive hover:text-destructive"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              Remove Admin
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Promote Dialog */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Administrator</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to promote to admin. They will gain full access to the admin panel, learner views, and all management actions.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="user@example.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && promoteEmail && promoteMutation.mutate(promoteEmail)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => promoteMutation.mutate(promoteEmail)}
              disabled={!promoteEmail || promoteMutation.isPending}
            >
              {promoteMutation.isPending ? "Promoting..." : "Promote to Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Demote Confirm */}
      <AlertDialog open={!!demoteTarget} onOpenChange={(open) => !open && setDemoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove admin privileges from{" "}
              <strong>{demoteTarget?.full_name || demoteTarget?.email}</strong>. They will retain their
              learner role and badges but lose access to the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => demoteTarget && demoteMutation.mutate(demoteTarget.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {demoteMutation.isPending ? "Removing..." : "Remove Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
