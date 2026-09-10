import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Assignment = { id: string; course_id: string; title: string; description: string | null; due_at: string | null; max_points: number };
type Submission = { assignment_id: string; grade: number | null; submitted_at: string };

export const Route = createFileRoute("/assignments/")({
  component: AssignmentsPage,
  head: () => ({ meta: [{ title: "Assignments — Gizmo Office Plus" }] }),
});

function AssignmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "submitted" | "graded">("pending");

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`assignments-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => qc.invalidateQueries({ queryKey: ["assignments"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-submissions"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => (await supabase.from("assignments" as never).select("*").order("due_at", { ascending: true })).data as unknown as Assignment[] ?? [],
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["my-submissions", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("assignment_submissions" as never).select("assignment_id, grade, submitted_at").eq("user_id", user!.id)).data as unknown as Submission[] ?? [],
  });

  const subMap = new Map(submissions.map((s) => [s.assignment_id, s]));
  const filtered = assignments.filter((a) => {
    const s = subMap.get(a.id);
    if (tab === "pending") return !s;
    if (tab === "submitted") return s && s.grade === null;
    return s && s.grade !== null;
  });

  return (
    <AppShell title="Assignments">
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="flex gap-2 mb-5">
          {(["pending", "submitted", "graded"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 rounded-full text-sm font-medium capitalize transition", tab === t ? "bg-primary text-primary-foreground" : "glass hover:bg-muted")}>{t}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No {tab} assignments.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const s = subMap.get(a.id);
              return (
                <Link key={a.id} to="/assignments/$id" params={{ id: a.id }} className="block glass rounded-2xl p-4 hover:glow transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{a.title}</div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        {a.due_at && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Due {format(new Date(a.due_at), "PP")}</span>}
                        <span>Max {a.max_points} pts</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {s?.grade !== null && s?.grade !== undefined ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-500"><CheckCircle2 className="h-4 w-4" /> {s.grade}/{a.max_points}</span>
                      ) : s ? (
                        <span className="text-xs text-amber-500 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Awaiting grade</span>
                      ) : (
                        <span className="text-xs text-primary">Open</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
