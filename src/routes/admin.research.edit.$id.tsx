import { getStorageUrl } from "@/lib/storage-url";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const RichEditor = lazy(() => import("@/components/RichEditor").then((m) => ({ default: m.RichEditor })));
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadWithSupabaseRetry, withSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/research/edit/$id")({ component: EditResearch });

function EditResearch() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    header_image_url: "",
    research_type: "drugs",
    category: "",
    section: "",
    content_html: "",
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses" as never).select("id, title").order("title");
      return (data ?? []) as unknown as Array<{ id: string; title: string }>;
    },
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("research").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Failed to load research"); setLoading(false); return; }
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        header_image_url: data.header_image_url ?? "",
        research_type: data.research_type ?? "drugs",
        category: data.category ?? "",
        section: data.section ?? "",
        content_html: data.content_html ?? "",
      });
      setLoading(false);
    })();
  }, [id]);

  const onUploadHeader = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await uploadWithSupabaseRetry("research-images", path, file, { contentType: file.type }, 6);
    if (uploadError) { toast.error(uploadError.message || "Upload failed"); setUploading(false); return; }
    const url = await getStorageUrl("research-images", path);
    setForm((f) => ({ ...f, header_image_url: url }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    const { error } = await withSupabaseRetry(
      () => supabase.from("research").update({
        title: form.title,
        description: form.description,
        header_image_url: form.header_image_url || null,
        category: form.category || form.research_type,
        research_type: form.research_type,
        section: form.section,
        content_html: form.content_html,
      } as any).eq("id", id),
      8,
      { kind: "table", target: "research", action: "update research" },
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Research updated!");
    navigate({ to: "/admin/research" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold gradient-text">Edit Research</h1>

      <section className="glass-strong rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Section 1 — Homepage Visibility</h2>

        <div className="space-y-2">
          <Label>Header image</Label>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md glass cursor-pointer hover:bg-muted/50 text-sm">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload image
              <input type="file" accept="image/*" className="hidden" onChange={onUploadHeader} disabled={uploading} />
            </label>
            {form.header_image_url && <img src={form.header_image_url} alt="" className="h-16 w-24 object-cover rounded-md" />}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="glass" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass min-h-20" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Course (research type)</Label>
            <Select value={form.research_type} onValueChange={(v) => setForm({ ...form, research_type: v })}>
              <SelectTrigger className="glass"><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {courses.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No courses — add one in the Courses tab first.</div>}
                {courses.map((c) => <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass" placeholder="e.g. medicine, discover" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section">Research section</Label>
            <Input id="section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="glass" placeholder="e.g. Oncology" />
          </div>
        </div>
      </section>

      <section className="glass-strong rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold">Section 2 — Content (Inside View)</h2>
        <Suspense fallback={<div className="h-64 glass rounded-xl flex items-center justify-center text-sm text-muted-foreground">Loading editor…</div>}>
          <RichEditor value={form.content_html} onChange={(html) => setForm({ ...form, content_html: html })} />
        </Suspense>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" onClick={() => setAiOpen(true)} variant="outline" className="glass w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
        <Button type="submit" disabled={saving} className="gradient-bg text-primary-foreground hover:opacity-90 glow w-full sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle>Generate research content with AI</DialogTitle></DialogHeader>
          <AiInner title={form.title} researchType={form.research_type} onInsert={(html) => { setForm((f) => ({ ...f, content_html: (f.content_html || "") + html })); setAiOpen(false); }} onClose={() => setAiOpen(false)} />
        </DialogContent>
      </Dialog>
    </form>
  );
}

function AiInner({ title, researchType, onInsert, onClose }: { title: string; researchType: string; onInsert: (html: string) => void; onClose: () => void }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!prompt.trim()) { toast.error("Describe what to generate"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-research", {
        body: { prompt, title, research_type: researchType },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onInsert((data as any)?.html ?? "");
      toast.success("AI content added");
    } catch (e: any) {
      toast.error(e?.message || "AI generation failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the research you want to draft…" className="glass min-h-40" />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="button" onClick={run} disabled={busy} className="gradient-bg text-primary-foreground">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate
        </Button>
      </DialogFooter>
    </>
  );
}

