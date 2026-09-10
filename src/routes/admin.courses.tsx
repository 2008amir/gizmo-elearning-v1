import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getStorageUrl } from "@/lib/storage-url";
import { uploadWithSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";
import { ImageCropDialog } from "@/components/ImageCropDialog";

export const Route = createFileRoute("/admin/courses")({ component: AdminCourses });

type Course = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  price: number;
  purchase_enabled: boolean;
  total_lessons: number | null;
};

const EMPTY = { title: "", description: "", image_url: "", price: "0", purchase_enabled: false, total_lessons: "1" };

function AdminCourses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("admin-courses-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-courses"] });
        qc.invalidateQueries({ queryKey: ["courses"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Course[];
    },
  });

  const startNew = () => { setEditing(null); setForm(EMPTY); };
  const startEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      price: String(c.price ?? 0),
      purchase_enabled: !!c.purchase_enabled,
      total_lessons: String(c.total_lessons ?? 1),
    });
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setPendingCrop(file);
  };

  const onCropped = async (blob: Blob) => {
    if (!user) return;
    setPendingCrop(null);
    setUploading(true);
    const path = `${user.id}/course-${Date.now()}.jpg`;
    const cropped = new File([blob], "course.jpg", { type: blob.type || "image/jpeg" });
    const { error } = await uploadWithSupabaseRetry("research-images", path, cropped, { contentType: cropped.type }, 6);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const url = await getStorageUrl("research-images", path);
    setForm((f) => ({ ...f, image_url: url }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const priceNum = Number(form.price) || 0;
    if (form.purchase_enabled && priceNum <= 0) { toast.error("Set a price greater than 0 when purchase is enabled"); return; }
    setSaving(true);
    const lessonsNum = Math.max(1, Number(form.total_lessons) || 1);
    const payload = {
      title: form.title,
      description: form.description,
      image_url: form.image_url || null,
      price: form.purchase_enabled ? priceNum : 0,
      purchase_enabled: form.purchase_enabled,
      total_lessons: lessonsNum,
    };
    const res = editing
      ? await supabase.from("courses" as never).update(payload as never).eq("id", editing.id)
      : await supabase.from("courses" as never).insert(payload as never);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Course updated" : "Course added");
    startNew();
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    const { error } = await supabase.from("courses" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={save} className="glass-strong rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold gradient-text">{editing ? "Edit course" : "Add a course"}</h2>
        <div className="space-y-2">
          <Label>Course image</Label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md glass cursor-pointer hover:bg-muted/50 text-sm">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
            </label>
            {form.image_url && <img src={form.image_url} alt="" className="h-16 w-24 object-cover rounded-md" />}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-title">Title</Label>
          <Input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="glass" placeholder="e.g. Cardiology" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-desc">Description</Label>
          <Textarea id="c-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass min-h-24" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-lessons">How many research items will this course cover?</Label>
          <Input id="c-lessons" type="number" min={1} step="1" value={form.total_lessons}
            onChange={(e) => setForm({ ...form, total_lessons: e.target.value })} className="glass" placeholder="e.g. 8" />
          <p className="text-xs text-muted-foreground">The student's progress bar counts completed research items out of this number.</p>
        </div>



        <div className="glass rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Purchase required</div>
              <div className="text-xs text-muted-foreground">If disabled, this course is unlocked for everyone.</div>
            </div>
            <Switch checked={form.purchase_enabled} onCheckedChange={(v) => setForm({ ...form, purchase_enabled: v })} />
          </div>
          {form.purchase_enabled && (
            <div className="space-y-1.5">
              <Label htmlFor="c-price">Price (₦)</Label>
              <Input id="c-price" type="number" min={0} step="1" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} className="glass" placeholder="e.g. 5000" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gradient-bg text-primary-foreground">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add course"}
          </Button>
          {editing && <Button type="button" variant="ghost" onClick={startNew}>Cancel</Button>}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold gradient-text">Courses</h2>
        {isLoading ? (
          <div className="glass rounded-xl h-40 animate-pulse" />
        ) : courses.length === 0 ? (
          <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">No courses yet.</div>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c.id} className="glass rounded-xl p-3 flex items-center gap-3">
                {c.image_url ? <img src={c.image_url} alt="" className="h-12 w-16 object-cover rounded-md" /> : <div className="h-12 w-16 rounded-md gradient-bg opacity-40" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {c.purchase_enabled ? `Premium · ₦${Number(c.price).toLocaleString()}` : "Free"}
                  </div>
                </div>
                <button onClick={() => startEdit(c)} className="p-2 rounded-md hover:bg-muted/50" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(c.id)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pendingCrop && (
        <ImageCropDialog
          file={pendingCrop}
          aspect={3 / 2}
          title="Crop course image"
          onCancel={() => setPendingCrop(null)}
          onCropped={(blob) => onCropped(blob)}
        />
      )}
    </div>
  );
}
