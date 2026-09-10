import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/course/$id/exam")({
  component: ExamPage,
  head: () => ({ meta: [{ title: "Final Exam — Gizmo Office Plus" }] }),
});

type Q = { id: string; question: string; options: string[]; correct_index: number };

function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function ExamPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const EXAM_SECONDS = 40 * 60;
  const storageKey = `exam-state-${id}`;

  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try { const raw = localStorage.getItem(storageKey); if (raw) return JSON.parse(raw).answers ?? {}; } catch {}
    return {};
  });
  const [submitted, setSubmitted] = useState<{ score: number; passed: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // End-time based timer so it keeps counting across navigations
  const [endAt] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) { const p = JSON.parse(raw); if (p.endAt && p.endAt > Date.now()) return p.endAt; }
      } catch {}
    }
    return Date.now() + EXAM_SECONDS * 1000;
  });
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.floor((endAt - Date.now()) / 1000)));

  const { data: course } = useQuery({
    queryKey: ["course-min", id],
    queryFn: async () => (await supabase.from("courses" as never).select("id,title,total_lessons,certificate_enabled").eq("id", id).maybeSingle()).data as any,
  });

  type QRow = { id: string; question: string; options: string[] };
  const { data: pool = [] } = useQuery({
    queryKey: ["exam-pool", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_exam_questions" as never, { _course_id: id } as never);
      return ((data as unknown as QRow[]) ?? []).map((q) => ({ ...q, correct_index: 0 })) as unknown as Q[];
    },
  });

  // Stable question set — persist chosen ids so refresh doesn't reshuffle
  const questions = useMemo(() => {
    if (pool.length === 0) return [] as Q[];
    let savedIds: string[] | null = null;
    try { const raw = localStorage.getItem(storageKey); if (raw) savedIds = JSON.parse(raw).questionIds ?? null; } catch {}
    if (savedIds && savedIds.length) {
      const byId = new Map(pool.map((q) => [q.id, q]));
      const restored = savedIds.map((qid) => byId.get(qid)).filter(Boolean) as Q[];
      if (restored.length) return restored;
    }
    return shuffle(pool).slice(0, Math.min(60, pool.length));
  }, [pool, storageKey]);

  // Persist state whenever answers/questions change
  useEffect(() => {
    if (questions.length === 0 || submitted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        answers, endAt, questionIds: questions.map((q) => q.id),
      }));
    } catch {}
  }, [answers, endAt, questions, storageKey, submitted]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (submitted || questions.length === 0) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, questions.length, endAt]);


  const mm = String(Math.floor(Math.max(0, secondsLeft) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, secondsLeft) % 60).padStart(2, "0");

  const submit = async (auto = false) => {
    if (!user || questions.length === 0) return;
    if (!auto && Object.keys(answers).length < questions.length) {
      if (!confirm(`You have not answered all ${questions.length} questions. Submit anyway?`)) return;
    }

    setSaving(true);
    const answersById: Record<string, number> = {};
    for (const q of questions) if (answers[q.id] !== undefined) answersById[q.id] = answers[q.id];
    const { data, error } = await supabase.rpc("submit_exam" as never, {
      _course_id: id,
      _answers: answersById as never,
      _question_ids: questions.map((q) => q.id) as never,
    } as never);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    const result = (data as unknown as { score: number; passed: boolean }) ?? { score: 0, passed: false };
    if (result.passed) toast.success("Congratulations! Certificate issued.");
    else toast.error("You scored below 70%. Please repeat the course.");
    setSubmitted({ score: result.score, passed: result.passed });
    setSaving(false);
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const onBack = () => navigate({ to: "/course/$id", params: { id } });

  if (!course) return <AppShell title="Exam" standalone onBack={onBack}><div className="p-6">Loading…</div></AppShell>;

  if (submitted) {
    return (
      <AppShell title="Exam result" standalone onBack={onBack}>
        <div className="max-w-xl mx-auto p-6 space-y-4 text-center">
          <div className={cn("text-6xl", submitted.passed ? "" : "opacity-60")}>{submitted.passed ? "🎓" : "📚"}</div>
          <h1 className="text-2xl font-bold">{submitted.passed ? "Congratulations!" : "Keep going"}</h1>
          <div className="text-4xl font-black gradient-text">{submitted.score}%</div>
          <p className="text-muted-foreground">
            {submitted.passed ? "You've earned your certificate for this course." : "You need 70% to pass. Please repeat the course and try again."}
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/course/$id", params: { id } })}>Back to course</Button>
            {submitted.passed && <Button className="gradient-bg text-primary-foreground" onClick={() => navigate({ to: "/certificates" })}>View certificate</Button>}
          </div>
        </div>
      </AppShell>
    );
  }

  if (questions.length === 0) {
    return <AppShell title="Exam" standalone onBack={onBack}><div className="p-6 text-sm text-muted-foreground">No exam questions have been added for this course yet.</div></AppShell>;
  }

  const answered = Object.keys(answers).length;

  return (
    <AppShell title={`Final exam — ${course.title}`} standalone onBack={onBack}>
      <div className="max-w-3xl mx-auto p-4 md:p-6 pb-32 space-y-4">
        <div className="glass rounded-xl p-3 sticky top-14 z-10">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-semibold">{answered} / {questions.length} answered</span>
            <span className={cn("font-mono font-bold", secondsLeft <= 60 ? "text-red-500 animate-pulse" : "text-muted-foreground")}>⏱ {mm}:{ss}</span>
            <span className="text-muted-foreground">Pass 70%</span>
          </div>
          <Progress value={(answered / questions.length) * 100} className="h-1.5" />
        </div>
        {questions.map((q, i) => (
          <div key={q.id} className="glass rounded-2xl p-4">
            <div className="font-semibold text-sm mb-3"><span className="text-primary mr-2">Q{i + 1}.</span>{q.question}</div>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className={cn(
                  "flex items-start gap-2 rounded-lg border border-border p-2.5 cursor-pointer text-sm hover:bg-muted/40",
                  answers[q.id] === oi && "border-primary bg-primary/10"
                )}>
                  <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="fixed bottom-0 inset-x-0 bg-background/95 border-t border-border p-3 backdrop-blur z-20">
          <div className="max-w-3xl mx-auto">
            <Button onClick={() => submit(false)} disabled={saving} size="lg" className="w-full gradient-bg text-primary-foreground h-12">Submit exam</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

