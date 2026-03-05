import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LearnerLayout from "@/layouts/LearnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, User } from "lucide-react";

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    toast.success("Avatar uploaded! Click Save to apply.");
  };

  return (
    <LearnerLayout>
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile information</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label
                  htmlFor="avatar-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload Photo
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG. Max 2MB.</p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-4 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </LearnerLayout>
  );
}
