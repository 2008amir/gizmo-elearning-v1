import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/exams/$courseId")({ component: CourseExam });

type Q = { id: string; question: string; options: string[]; correct_index: number; source: string };

function CourseExam() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [manQuestion, setManQuestion] = useState("");
  const [manOptions, setManOptions] = useState<string[]>(["", "", "", ""]);
  const [manCorrect, setManCorrect] = useState(0);
  const [aiCount, setAiCount] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ch = supabase.channel(`exam-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_questions", filter: `course_id=eq.${courseId}` }, () => qc.invalidateQueries({ queryKey: ["exam-qs", courseId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [courseId, qc]);

  const { data: course } = useQuery({
    queryKey: ["exam-course", courseId],
    queryFn: async () => (await supabase.from("courses" as never).select("id,title").eq("id", courseId).maybeSingle()).data as any,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["exam-qs", courseId],
    queryFn: async () => (await supabase.from("exam_questions" as never).select("*").eq("course_id", courseId).order("created_at", { ascending: false })).data as unknown as Q[] ?? [],
  });

  const saveManual = async () => {
    if (!manQuestion.trim()) return toast.error("Question required");
    if (manOptions.filter((o) => o.trim()).length < 2) return toast.error("At least 2 options");
    setSaving(true);
    const { error } = await supabase.from("exam_questions" as never).insert({
      course_id: courseId, question: manQuestion, options: manOptions.filter((o) => o.trim()), correct_index: manCorrect, source: "manual",
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Question added");
    setManQuestion(""); setManOptions(["", "", "", ""]); setManCorrect(0);
  };

  const generateAI = async () => {
    if (!course?.title) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-exam", {
        body: { course_id: courseId, course_title: course.title, count: aiCount },
      });
      if (error) throw error;
      if ((data as any)?.needs_content) {
        toast.error((data as any).message ?? "Add course content before generating exam questions");
        return;
      }
      const created = (data as any)?.created ?? 0;
      toast.success(`Generated ${created} questions from course research`);
      qc.invalidateQueries({ queryKey: ["exam-qs", courseId] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "AI generation failed");
    } finally {
      setSaving(false);
    }
  };

  const removeQ = async (id: string) => {
    const prev = qc.getQueryData<Q[]>(["exam-qs", courseId]) ?? [];
    qc.setQueryData<Q[]>(["exam-qs", courseId], prev.filter((q) => q.id !== id));
    const { error } = await supabase.from("exam_questions" as never).delete().eq("id", id);
    if (error) {
      qc.setQueryData<Q[]>(["exam-qs", courseId], prev);
      toast.error(error.message);
    } else {
      toast.success("Question deleted");
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <Link to="/admin/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All courses</Link>
      <h2 className="text-xl font-bold gradient-text">{course?.title ?? "Course"} — exam questions ({questions.length})</h2>

      {questions.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">No exam questions yet. Add some manually or generate with AI.</div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="glass rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="text-xs text-muted-foreground shrink-0">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{q.question}</div>
                  <ul className="mt-2 text-xs space-y-1">
                    {q.options.map((o, oi) => (
                      <li key={oi} className={oi === q.correct_index ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                        {oi === q.correct_index ? "✓" : "•"} {o}
                      </li>
                    ))}
                  </ul>
                  <div className="text-[10px] text-muted-foreground mt-2 uppercase">Source: {q.source}</div>
                </div>
                <button onClick={() => removeQ(q.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-14 w-14 rounded-full gradient-bg text-primary-foreground shadow-2xl z-40">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add exam question</DialogTitle></DialogHeader>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="manual" /> Manual</label>
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="ai" /> <Sparkles className="h-4 w-4" /> Generate with AI</label>
          </RadioGroup>

          {mode === "manual" ? (
            <div className="space-y-3">
              <div><Label>Question</Label><Textarea value={manQuestion} onChange={(e) => setManQuestion(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Options (click circle to mark the correct one)</Label>
                {manOptions.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button type="button" onClick={() => setManCorrect(i)} className={`h-5 w-5 rounded-full border-2 shrink-0 ${manCorrect === i ? "bg-emerald-500 border-emerald-500" : "border-border"}`} />
                    <Input value={o} onChange={(e) => setManOptions(manOptions.map((v, j) => j === i ? e.target.value : v))} placeholder={`Option ${i + 1}`} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setManOptions([...manOptions, ""])}>+ Add option</Button>
              </div>
              <Button onClick={saveManual} disabled={saving} className="w-full gradient-bg text-primary-foreground">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save question</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">The AI will read every research item published under this course and generate multiple-choice questions strictly from that content.</p>
              <div><Label>How many questions?</Label><Input type="number" min={1} max={100} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value) || 10)} /></div>
              <Button onClick={generateAI} disabled={saving} className="w-full gradient-bg text-primary-foreground">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Generate</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
