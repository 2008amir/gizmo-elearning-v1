import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { Circle, CheckCircle2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/learning/path")({
  component: LearningPath,
  head: () => ({ meta: [{ title: "Learning Path — Gizmo Office Plus" }] }),
});

type Course = { id: string; title: string; image_url: string | null; level?: string; total_lessons?: number };

function LearningPath() {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses" as never).select("*").order("created_at", { ascending: true })).data as unknown as Course[] ?? [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("course_purchases" as never).select("course_id, status").eq("user_id", user!.id).eq("status", "approved")).data as { course_id: string }[] ?? [],
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress-all", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("research_progress").select("research_type").eq("user_id", user!.id)).data as { research_type: string }[] ?? [],
  });

  const { data: research = [] } = useQuery({
    queryKey: ["research-titles"],
    queryFn: async () => (await supabase.from("research").select("id, research_type")).data as { research_type: string }[] ?? [],
  });

  const purchased = new Set(purchases.map((p) => p.course_id));
  const path = courses.filter((c) => purchased.has(c.id));

  const pct = (title: string) => {
    const total = research.filter((r) => r.research_type === title).length;
    if (!total) return 0;
    return Math.round((progress.filter((p) => p.research_type === title).length / total) * 100);
  };

  return (
    <AppShell title="Learning Path">
      <div className="p-4 md:p-6 max-w-3xl">
        <p className="text-sm text-muted-foreground mb-6">Your recommended sequence of enrolled courses. Complete them in order to build your skills step by step.</p>
        {path.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">Enroll in a course to start building your learning path.</p>
            <Link to="/learning/all" className="mt-4 inline-block text-sm text-primary hover:underline">Browse courses</Link>
          </div>
        ) : (
          <ol className="relative border-l-2 border-primary/30 ml-3 space-y-6">
            {path.map((c, i) => {
              const p = pct(c.title);
              const done = p >= 100;
              const active = !done && p > 0;
              return (
                <li key={c.id} className="pl-8">
                  <span className="absolute -left-[13px] h-6 w-6 rounded-full flex items-center justify-center bg-background border-2 border-primary">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : active ? <PlayCircle className="h-5 w-5 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </span>
                  <Link to="/course/$id" params={{ id: c.id }} className="block glass rounded-2xl p-4 hover:glow transition">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Step {i + 1}</div>
                        <div className="font-semibold">{c.title}</div>
                        <div className="text-xs text-muted-foreground">{c.total_lessons ?? 0} lessons · {c.level ?? "All levels"}</div>
                      </div>
                      <div className="text-sm font-bold">{p}%</div>
                    </div>
                    <Progress value={p} className="mt-2 h-1.5" />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
