import { getStorageUrl } from "@/lib/storage-url";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
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
import { RESEARCH_TEMPLATES } from "@/lib/research-templates";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

const searchSchema = z.object({
  template: z.string().optional(),
});

export const Route = createFileRoute("/admin/research/new")({
  component: AddResearch,
  validateSearch: (search) => searchSchema.parse(search),
});

function AddResearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { template: templateId } = Route.useSearch();

  const initialContent = (() => {
    if (templateId === "custom" && typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("ecomedic-template-html");
      if (stored) return stored;
    }
    return templateId
      ? RESEARCH_TEMPLATES.find((t) => t.id === templateId)?.content_html ?? ""
      : "";
  })();

  const [form, setForm] = useState({
    title: "",
    description: "",
    header_image_url: "",
    research_type: "",
    category: "",
    section: "",
    content_html: initialContent,
  });
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

    // "Post" — broadcast to every user's notification bell instead of creating a research entry
    if (form.research_type === "__post__") {
      const { data: postId, error } = await supabase.rpc("create_post_and_broadcast" as never, {
        _title: form.title,
        _description: form.description,
        _header_image_url: form.header_image_url || null,
        _content_html: form.content_html,
      } as never);
      if (error) { setSaving(false); toast.error(error.message); return; }
      // Fan out browser push (works even when the tab is closed)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken && postId) {
          await fetch("/api/public/broadcast-post-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, accessToken }),
          });
        }
      } catch { /* push is best-effort */ }
      setSaving(false);
      toast.success("Post sent to all users");
      navigate({ to: "/admin/posts" });
      return;
    }

    const { error } = await withSupabaseRetry(
      () => supabase.from("research").insert({
        title: form.title,
        description: form.description,
        header_image_url: form.header_image_url || null,
        category: form.category || form.research_type,
        research_type: form.research_type,
        section: form.section,
        content_html: form.content_html,
        author_id: user.id,
      } as any),
      8,
      { kind: "table", target: "research", action: "publish research" },
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Research published!");
    navigate({ to: "/admin/research" });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold gradient-text">Add Research</h1>

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
          <p className="text-xs text-muted-foreground">
            A research number will be generated automatically (e.g. <span className="font-mono">ESR-Dr-00001</span>) based on the research type.
          </p>
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
                <SelectItem value="__post__">📣 Post (broadcast to all users)</SelectItem>
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
          Publish research
        </Button>
      </div>

      <AiDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        title={form.title}
        researchType={form.research_type}
        onInsert={(html) => setForm((f) => ({ ...f, content_html: (f.content_html || "") + html }))}
      />
    </form>
  );
}

function AiDialog({ open, onOpenChange, title, researchType, onInsert }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; researchType: string; onInsert: (html: string) => void }) {
  const [step, setStep] = useState<"template" | "prompt">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const templateHtml = selectedTemplateId === "__blank__"
    ? ""
    : RESEARCH_TEMPLATES.find((t) => t.id === selectedTemplateId)?.content_html ?? "";

  const chooseTemplate = () => {
    if (!selectedTemplateId) { toast.error("Choose a template (or Blank) first"); return; }
    setStep("prompt");
  };

  const run = async () => {
    if (!prompt.trim()) { toast.error("Describe what to generate"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-research", {
        body: { prompt, title, research_type: researchType, template_html: templateHtml },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onInsert((data as any)?.html ?? "");
      toast.success("AI content added");
      onOpenChange(false);
      setPrompt("");
      setSelectedTemplateId("");
      setStep("template");
    } catch (e: any) {
      toast.error(e?.message || "AI generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStep("template"); } }}>
      <DialogContent className="glass-strong max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "Step 1 — Choose a template" : "Step 2 — Describe & generate"}
          </DialogTitle>
        </DialogHeader>

        {step === "template" ? (
          <>
            <p className="text-xs text-muted-foreground">
              Pick a template. The AI will customize it (keeping layout, colors and styles) with your requested content in the next step.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => setSelectedTemplateId("__blank__")}
                className={`glass rounded-xl p-4 text-left transition ${selectedTemplateId === "__blank__" ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}
              >
                <div className="h-24 rounded-lg bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Blank</div>
                <div className="mt-2 text-sm font-medium">No template</div>
                <div className="text-[10px] text-muted-foreground">AI writes freely</div>
              </button>
              {RESEARCH_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`glass rounded-xl p-3 text-left transition overflow-hidden ${selectedTemplateId === t.id ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}
                >
                  <div className="h-24 relative overflow-hidden rounded-lg" style={{ background: t.preview_bg }}>
                    <div className="absolute inset-0 scale-[0.2] origin-top-left w-[500%] h-[500%] pointer-events-none" dangerouslySetInnerHTML={{ __html: t.content_html }} />
                  </div>
                  <div className="mt-2 text-sm font-medium truncate">{t.name}</div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={chooseTemplate} className="gradient-bg text-primary-foreground">Next</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {selectedTemplateId === "__blank__"
                ? "No template selected — the AI will produce fresh HTML."
                : `Using template: ${RESEARCH_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name}. AI will customize it with your content.`}
            </p>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the research you want to draft…" className="glass min-h-40" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep("template")} disabled={busy}>Back</Button>
              <Button type="button" onClick={run} disabled={busy} className="gradient-bg text-primary-foreground">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

