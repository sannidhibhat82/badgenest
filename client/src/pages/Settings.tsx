import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { users as usersApi, auth as authApi, uploadFile } from "@/lib/api";
import LearnerLayout from "@/layouts/LearnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, User, Shield, LogOut, CheckCircle, KeyRound } from "lucide-react";

import { API_BASE } from "@/lib/env";

function ChangePasswordCard() {
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      await authApi.updatePassword(newPw);
      toast.success("Password updated!");
      setNewPw("");
      setConfirmPw("");
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Change Password
        </CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-pw" className="text-sm font-medium">New Password</Label>
          <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-pw" className="text-sm font-medium">Confirm Password</Label>
          <Input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" className="h-11" />
        </div>
        <Button onClick={handleChange} disabled={saving || !newPw} className="w-full h-11">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saved, setSaved] = useState(false);

  const initials = fullName ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase() : "U";
  const displayAvatarUrl = avatarUrl?.startsWith("http") ? avatarUrl : avatarUrl ? `${API_BASE}${avatarUrl}` : "";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await usersApi.updateMe({ full_name: fullName, avatar_url: avatarUrl || undefined });
      setSaved(true);
      toast.success("Profile updated!");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const { publicUrl } = await uploadFile("avatars", file);
      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded! Click Save to apply.");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <LearnerLayout>
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="space-y-1 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card className="border-border/60 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>Update your name and avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-5">
                  <Avatar className="h-20 w-20 ring-2 ring-border shadow-sm">
                    <AvatarImage src={displayAvatarUrl || undefined} />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="avatar-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-muted/50 hover:shadow-sm">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Photo
                    </Label>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG. Max 2MB.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-sm font-medium">Full Name</Label>
                  <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input value={user?.email ?? ""} disabled className="h-11 bg-muted/30" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full h-11">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="mr-2 h-4 w-4 text-success" /> : null}
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <ChangePasswordCard />
            <Card className="border-destructive/20 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-destructive" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Actions that affect your account</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Signing out will end your current session. You can sign back in at any time.
                </p>
                <Button variant="destructive" onClick={signOut} className="shadow-sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LearnerLayout>
  );
}
