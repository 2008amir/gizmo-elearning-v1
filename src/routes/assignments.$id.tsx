import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft, CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assignments/$id")({
  component: AssignmentDetail,
  head: () => ({ meta: [{ title: "Assignment — Gizmo Office Plus" }] }),
});

type MCQ = { question: string; options: string[]; correct_index: number };

function AssignmentDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: assignment } = useQuery({
    queryKey: ["assignment", id],
    queryFn: async () => (await supabase.from("assignments" as never).select("*").eq("id", id).maybeSingle()).data as any,
  });

  const { data: sub } = useQuery({
    queryKey: ["submission", id, user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("assignment_submissions" as never).select("*").eq("assignment_id", id).eq("user_id", user!.id).maybeSingle()).data as any,
  });

  const types = assignment?.submission_types ?? { text: true, file: false, objective: false };
  const questions: MCQ[] = Array.isArray(assignment?.questions) ? assignment.questions : [];

  const objectiveOnly = types.objective && !types.text && !types.file;

  const mcqScore = useMemo(() => {
    if (!questions.length) return null;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_index) correct++; });
    return { correct, total: questions.length, pct: (correct / questions.length) * 100 };
  }, [answers, questions]);

  const submit = async () => {
    if (!user || !assignment) return;
    if (types.text && !content.trim()) { toast.error("Please write your submission"); return; }
    if (types.objective && Object.keys(answers).length < questions.length) { toast.error(`Answer all ${questions.length} questions`); return; }
    setSubmitting(true);

    // Grading fields are set server-side only. The DB trigger will strip any client-supplied grade.
    const payload: Record<string, unknown> = {
      assignment_id: id,
      user_id: user.id,
      content: types.text ? content : null,
      file_url: types.file && fileUrl ? fileUrl : null,
      answers: types.objective ? answers : null,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    };

    const { data: upsertedRaw, error } = await supabase
      .from("assignment_submissions" as never)
      .upsert(payload as never, { onConflict: "assignment_id,user_id" })
      .select()
      .maybeSingle();
    if (error) { setSubmitting(false); toast.error(error.message); return; }
    const upserted = upsertedRaw as { id?: string } | null;

    // Server-side objective auto-grading
    if (objectiveOnly && upserted?.id) {
      try {
        await supabase.rpc("grade_assignment_objective" as never, { _submission_id: upserted.id } as never);
      } catch {}
    }

    // AI-grade text answer server-side
    if (types.text && !types.file && upserted?.id) {
      try {
        await supabase.functions.invoke("ai-grade-text", { body: { submission_id: upserted.id } });
      } catch {}
    }

    setSubmitting(false);
    toast.success("Assignment submitted");
    qc.invalidateQueries({ queryKey: ["submission", id] });
    qc.invalidateQueries({ queryKey: ["my-submissions"] });
  };

  const alreadyGraded = sub?.status === "graded" || (sub?.grade !== null && sub?.grade !== undefined);

  return (
    <AppShell title="Assignment">
      <div className="p-4 md:p-6 max-w-3xl">
        <button onClick={() => navigate({ to: "/assignments" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {!assignment ? <div className="text-sm text-muted-foreground">Loading...</div> : (
          <>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              {assignment.due_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Due {format(new Date(assignment.due_at), "PPp")}</span>}
              <span>Max {assignment.max_points} points</span>
            </div>
            {assignment.description && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line">{assignment.description}</p>}

            <div className="mt-6 glass rounded-2xl p-5 space-y-4">
              <h2 className="font-bold">Your submission</h2>
              {alreadyGraded ? (
                <div>
                  <div className="text-sm">Grade: <span className="font-bold text-emerald-500">{sub.grade}/{assignment.max_points}</span>
                    {sub.score_pct != null && <span className="ml-2 text-muted-foreground">({Number(sub.score_pct).toFixed(0)}%)</span>}
                    {sub.graded_via && <span className="ml-2 text-[10px] uppercase text-muted-foreground">via {sub.graded_via}</span>}
                  </div>
                  {sub.feedback && <p className="mt-2 text-sm text-muted-foreground">{sub.feedback}</p>}
                  <div className="mt-3 text-xs text-muted-foreground">Submitted {format(new Date(sub.submitted_at), "PPp")}</div>
                  {sub.content && <div className="mt-3 whitespace-pre-line text-sm border-t border-border pt-3">{sub.content}</div>}
                </div>
              ) : (
                <>
                  {types.text && (
                    <div>
                      <div className="text-sm font-semibold mb-1">Written answer</div>
                      <Textarea
                        value={content || sub?.content || ""}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type your answer..."
                        className="min-h-40"
                      />
                    </div>
                  )}
                  {types.file && (
                    <div>
                      <div className="text-sm font-semibold mb-1">Upload file</div>
                      <input
                        type="file"
                        disabled={uploading}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f || !user) return;
                          setUploading(true);
                          const path = `${user.id}/${id}/${Date.now()}-${f.name}`;
                          const { error: upErr } = await supabase.storage.from("assignments").upload(path, f, { upsert: true });
                          if (upErr) { toast.error(upErr.message); setUploading(false); return; }
                          const { data: signed } = await supabase.storage.from("assignments").createSignedUrl(path, 60 * 60 * 24 * 365);
                          setFileUrl(signed?.signedUrl ?? "");
                          setFileName(f.name);
                          setUploading(false);
                          toast.success("File uploaded");
                        }}
                        className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground"
                      />
                      {uploading && <div className="text-xs text-muted-foreground mt-1">Uploading…</div>}
                      {(fileName || sub?.file_url) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {fileName ? `Ready to submit: ${fileName}` : (
                            <a href={sub!.file_url} target="_blank" rel="noreferrer" className="text-primary underline">Current file</a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {types.objective && questions.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold">Objective questions ({questions.length})</div>
                      {questions.map((q, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <div className="text-sm font-medium">{i + 1}. {q.question}</div>
                          <div className="mt-2 space-y-1">
                            {q.options.map((o, oi) => (
                              <label key={oi} className={cn(
                                "flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm hover:bg-muted/40",
                                answers[i] === oi && "bg-primary/10 ring-1 ring-primary",
                              )}>
                                <input
                                  type="radio"
                                  name={`q-${i}`}
                                  checked={answers[i] === oi}
                                  onChange={() => setAnswers({ ...answers, [i]: oi })}
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      {objectiveOnly && mcqScore && Object.keys(answers).length === questions.length && (
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Preview: {mcqScore.correct}/{mcqScore.total} — will be auto-graded on submit
                        </div>
                      )}
                    </div>
                  )}
                  <Button onClick={submit} disabled={submitting} className="gradient-bg text-primary-foreground">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {sub ? "Update submission" : "Submit assignment"}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
