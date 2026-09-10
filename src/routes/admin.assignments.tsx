import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/assignments")({ component: AdminAssignments });

type MCQ = { question: string; options: string[]; correct_index: number };

function AdminAssignments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("admin-assignments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => qc.invalidateQueries({ queryKey: ["assignments-admin"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, () => qc.invalidateQueries({ queryKey: ["submissions-admin"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold gradient-text">Assignments</h2>
      <Tabs defaultValue="add">
        <TabsList>
          <TabsTrigger value="add">Add</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="marked">Marked</TabsTrigger>
        </TabsList>
        <TabsContent value="add" className="mt-4"><AddAssignmentForm userId={user?.id} /></TabsContent>
        <TabsContent value="submitted" className="mt-4"><SubmissionsList status="submitted" /></TabsContent>
        <TabsContent value="marked" className="mt-4"><SubmissionsList status="graded" /></TabsContent>
      </Tabs>
    </div>
  );
}

function AddAssignmentForm({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState<string>("general");
  const [enableText, setEnableText] = useState(true);
  const [enableFile, setEnableFile] = useState(false);
  const [enableObjective, setEnableObjective] = useState(false);
  const [buildMode, setBuildMode] = useState<"manual" | "ai">("manual");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-select"],
    queryFn: async () => ((await supabase.from("courses" as never).select("id,title").order("title")).data ?? []) as any[],
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["assignments-admin"],
    queryFn: async () => ((await supabase.from("assignments" as never).select("id,title,course_id,submission_types,created_at").order("created_at", { ascending: false })).data ?? []) as any[],
  });

  const addBlankMCQ = () => setMcqs([...mcqs, { question: "", options: ["", "", "", ""], correct_index: 0 }]);
  const updateMCQ = (i: number, patch: Partial<MCQ>) => setMcqs(mcqs.map((m, j) => j === i ? { ...m, ...patch } : m));
  const removeMCQ = (i: number) => setMcqs(mcqs.filter((_, j) => j !== i));

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return toast.error("Describe the assignment first");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-mcq", {
        body: { prompt: aiPrompt, count: aiCount },
      });
      if (error) throw error;
      const qs = (data as any)?.questions as MCQ[];
      if (!Array.isArray(qs)) throw new Error("Bad AI response");
      setMcqs(qs);
      toast.success(`Generated ${qs.length} questions`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Title required");
    if (!enableText && !enableFile && !enableObjective) return toast.error("Pick at least one submission type");
    if (enableObjective && mcqs.length === 0) return toast.error("Add at least one objective question");
    setSaving(true);
    void userId;
    const payload: any = {
      title, description,
      course_id: courseId === "general" ? null : courseId,
      submission_types: { text: enableText, file: enableFile, objective: enableObjective },
      questions: enableObjective ? mcqs : [],
      max_points: 100,
    };
    const { error } = await supabase.from("assignments" as never).insert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Assignment created");
    setTitle(""); setDescription(""); setMcqs([]); setEnableObjective(false); setEnableFile(false); setEnableText(true); setAiPrompt("");
    qc.invalidateQueries({ queryKey: ["assignments-admin"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    const { error } = await supabase.from("assignments" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-strong rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold">Add assignment</h3>
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>Instructions / questions</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <Label>For which course?</Label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="general">General assignment</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div className="glass rounded-xl p-3 space-y-2">
          <div className="text-sm font-semibold">Submission options</div>
          <div className="flex items-center justify-between"><Label>Enable text area</Label><Switch checked={enableText} onCheckedChange={setEnableText} /></div>
          <div className="flex items-center justify-between"><Label>Enable file upload</Label><Switch checked={enableFile} onCheckedChange={setEnableFile} /></div>
          <div className="flex items-center justify-between"><Label>Enable objective questions</Label><Switch checked={enableObjective} onCheckedChange={setEnableObjective} /></div>
        </div>

        {enableObjective && (
          <div className="glass rounded-xl p-3 space-y-3">
            <RadioGroup value={buildMode} onValueChange={(v) => setBuildMode(v as any)} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="manual" /> Manual</label>
              <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="ai" /><Sparkles className="h-4 w-4" /> With AI</label>
            </RadioGroup>

            {buildMode === "ai" && (
              <div className="space-y-2">
                <Textarea rows={3} placeholder="Describe the assignment topic for the AI…" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value) || 5)} className="w-20" />
                  <Button size="sm" onClick={generateWithAI} disabled={generating}>{generating && <Loader2 className="h-3 w-3 mr-2 animate-spin" />} Generate</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {mcqs.map((m, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Question {i + 1}</span>
                    <button onClick={() => removeMCQ(i)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  <Textarea rows={2} value={m.question} onChange={(e) => updateMCQ(i, { question: e.target.value })} placeholder="Question…" />
                  {m.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button type="button" onClick={() => updateMCQ(i, { correct_index: oi })} className={`h-4 w-4 rounded-full border-2 shrink-0 ${m.correct_index === oi ? "bg-emerald-500 border-emerald-500" : "border-border"}`} />
                      <Input value={o} onChange={(e) => updateMCQ(i, { options: m.options.map((v, k) => k === oi ? e.target.value : v) })} placeholder={`Option ${oi + 1}`} />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => updateMCQ(i, { options: [...m.options, ""] })}>+ Option</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addBlankMCQ}><Plus className="h-3 w-3 mr-1" /> Add question</Button>
            </div>
          </div>
        )}

        <Button onClick={save} disabled={saving} className="w-full gradient-bg text-primary-foreground">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create assignment</Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Existing assignments</h3>
        {existing.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">None yet.</div> : existing.map((a: any) => {
          const c = courses.find((c: any) => c.id === a.course_id);
          return (
            <div key={a.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">{c?.title ?? "General"} · {[a.submission_types?.text && "Text", a.submission_types?.file && "File", a.submission_types?.objective && "MCQ"].filter(Boolean).join(" · ")}</div>
              </div>
              <button onClick={() => remove(a.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionsList({ status }: { status: "submitted" | "graded" }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["submissions-admin", status],
    queryFn: async () => {
      const { data } = await supabase.from("assignment_submissions" as never).select("*").eq("status", status).order("submitted_at", { ascending: false });
      const list = ((data ?? []) as any[]);
      if (!list.length) return [];
      const uids = Array.from(new Set(list.map((r) => r.user_id)));
      const aids = Array.from(new Set(list.map((r) => r.assignment_id)));
      const [{ data: profs }, { data: aa }] = await Promise.all([
        supabase.from("profiles").select("id,first_name,last_name,username").in("id", uids),
        supabase.from("assignments" as never).select("id,title").in("id", aids),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const aMap = new Map(((aa ?? []) as any[]).map((a) => [a.id, a]));
      return list.map((r) => ({ ...r, profile: pMap.get(r.user_id), assignment: aMap.get(r.assignment_id) }));
    },
  });

  const grade = async (id: string, score: number, feedback: string) => {
    const { error } = await supabase.from("assignment_submissions" as never).update({ status: "graded", score_pct: score, grade: score, feedback, graded_at: new Date().toISOString(), graded_via: "manual" } as never).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Graded"); qc.invalidateQueries({ queryKey: ["submissions-admin"] }); }
  };

  if (isLoading) return <div className="glass rounded-xl h-40 animate-pulse" />;
  if (rows.length === 0) return <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">Nothing here.</div>;

  return (
    <div className="space-y-3">
      {rows.map((r: any) => (
        <div key={r.id} className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{r.assignment?.title ?? "Assignment"}</div>
              <div className="text-xs text-muted-foreground">{r.profile?.first_name} {r.profile?.last_name} · {format(new Date(r.submitted_at), "PPp")}</div>
            </div>
            {status === "graded" && <div className="text-lg font-bold gradient-text">{r.score_pct != null ? `${Number(r.score_pct).toFixed(0)}%` : `${r.grade ?? 0}`}</div>}
          </div>
          {r.content && <div className="text-sm bg-muted/20 p-2 rounded whitespace-pre-wrap">{r.content}</div>}
          {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">View uploaded file</a>}
          {r.feedback && <div className="text-xs text-muted-foreground italic">Feedback: {r.feedback}</div>}
          {status === "submitted" && (
            <ManualGrade onGrade={(s, f) => grade(r.id, s, f)} />
          )}
        </div>
      ))}
    </div>
  );
}

function ManualGrade({ onGrade }: { onGrade: (score: number, feedback: string) => void }) {
  const [score, setScore] = useState(80);
  const [fb, setFb] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
      <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-20" />
      <Input placeholder="Feedback (optional)" value={fb} onChange={(e) => setFb(e.target.value)} className="flex-1 min-w-40" />
      <Button size="sm" onClick={() => onGrade(score, fb)}>Grade</Button>
    </div>
  );
}
