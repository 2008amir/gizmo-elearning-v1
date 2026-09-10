import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/communities/new")({
  component: NewCommunityPage,
  head: () => ({ meta: [{ title: "Create community — Gizmo Office Plus" }] }),
});

function NewCommunityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowOpenJoin, setAllowOpenJoin] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/community-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setImageUrl(data?.signedUrl ?? null);
    setUploading(false);
  };

  const submit = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Community name is required"); return; }
    if (!description.trim()) { toast.error("Please add a short description"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("communities" as never)
      .insert({ owner_id: user.id, name: name.trim(), description: description.trim(), image_url: imageUrl, allow_open_join: allowOpenJoin } as never)
      .select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Community created");
    const cid = (data as { id?: string } | null)?.id;
    if (cid) navigate({ to: "/communities/$id", params: { id: cid } });
    else navigate({ to: "/communities" });
  };

  return (
    <AppShell title="Create community" standalone onBack={() => navigate({ to: "/communities" })}>
      <div className="max-w-xl mx-auto p-4 md:p-6 space-y-5">
        <div>
          <Label className="text-sm font-semibold">Profile image *</Label>
          <div className="mt-2 flex items-center gap-4">
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-2xl gradient-bg flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary-foreground/80" />
              </div>
            )}
            <label className="glass rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-muted inline-flex items-center gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {imageUrl ? "Change image" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div>
          <Label htmlFor="name" className="text-sm font-semibold">Name *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Wizards" className="mt-2" maxLength={80} />
        </div>

        <div>
          <Label htmlFor="desc" className="text-sm font-semibold">Description *</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community about?" className="mt-2 min-h-28" maxLength={500} />
        </div>

        <div className="glass rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Allow anyone to join without approval</div>
            <p className="text-xs text-muted-foreground mt-0.5">If off, users must request and be approved by you.</p>
          </div>
          <Switch checked={allowOpenJoin} onCheckedChange={setAllowOpenJoin} />
        </div>

        <Button onClick={submit} disabled={saving || uploading} className="w-full gradient-bg text-primary-foreground h-12">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create community
        </Button>
      </div>
    </AppShell>
  );
}
