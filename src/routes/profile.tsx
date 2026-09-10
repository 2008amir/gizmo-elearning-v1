import { getStorageUrl } from "@/lib/storage-url";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountrySelect } from "@/components/CountrySelect";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithSupabaseRetry, withSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";
import { Loader2, Upload, LogOut } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { ImageCropDialog } from "@/components/ImageCropDialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Gizmo Office Plus" }] }),
});

function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", country: "", phone: "", avatar_url: "" });
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);

  useEffect(() => {
    if (profile) setForm({
      first_name: profile.first_name ?? "", last_name: profile.last_name ?? "", username: profile.username ?? "",
      country: profile.country ?? "", phone: profile.phone ?? "", avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const onAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setPendingCrop(file);
  };

  const onAvatarCropped = async (blob: Blob) => {
    if (!user) return;
    setPendingCrop(null);
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const cropped = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
    const { error: upErr } = await uploadWithSupabaseRetry("avatars", path, cropped, { contentType: cropped.type, upsert: true }, 6);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const url = await getStorageUrl("avatars", path);
    setForm((f) => ({ ...f, avatar_url: url }));
    setUploading(false);
    toast.success("Avatar uploaded — click Update to save.");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await withSupabaseRetry(() => supabase.from("profiles").update({
        first_name: form.first_name, last_name: form.last_name, username: form.username,
        country: form.country, phone: form.phone, avatar_url: form.avatar_url,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id), 6, { kind: "table", target: "profiles", action: "update profile" });
      if (error) { toast.error(error.message); setSaving(false); return; }
      if (password.trim().length >= 6) {
        const { error: pErr } = await supabase.auth.updateUser({ password });
        if (pErr) { toast.error(pErr.message); setSaving(false); return; }
        setPassword("");
      }
      await refreshProfile();
      toast.success("Profile updated");
    } finally { setSaving(false); }
  };

  const initials = ((form.first_name?.[0] ?? "") + (form.last_name?.[0] ?? "")).toUpperCase() || "U";

  return (
    <AppShell title="Profile">
      <div className="p-4 md:p-6 max-w-2xl">
        <form onSubmit={onSubmit} className="glass-strong rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-2 ring-border"><AvatarImage src={form.avatar_url || undefined} /><AvatarFallback className="gradient-bg text-primary-foreground text-xl font-bold">{initials}</AvatarFallback></Avatar>
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md glass cursor-pointer hover:bg-muted/50 text-sm">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Change avatar
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} disabled={uploading} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">Visible to everyone.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="first_name">First name</Label><Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="last_name">Last name</Label><Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="username">Username</Label><Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email (read-only)</Label><Input value={user?.email ?? ""} disabled className="opacity-60" /></div>
          <div className="space-y-1.5"><Label>Country</Label><CountrySelect value={form.country} onChange={(v) => setForm({ ...form, country: v })} /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="password">New password (optional)</Label><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" showStrength={password.length > 0} /></div>
          <Button type="submit" disabled={saving} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
          </Button>
        </form>
        <Button type="button" variant="outline" disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try { await signOut(); toast.success("Signed out"); navigate({ to: "/" }); }
            catch (e: any) { toast.error(e?.message ?? "Sign out failed"); }
            finally { setSigningOut(false); }
          }}
          className="mt-4 w-full border-destructive/40 text-destructive hover:bg-destructive/10">
          {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />} Sign out
        </Button>
      </div>
      {pendingCrop && (
        <ImageCropDialog
          file={pendingCrop}
          aspect={1}
          title="Crop profile picture"
          onCancel={() => setPendingCrop(null)}
          onCropped={(blob) => onAvatarCropped(blob)}
        />
      )}
    </AppShell>
  );
}
