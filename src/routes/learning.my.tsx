import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";

type Course = { id: string; title: string; description: string; image_url: string | null; total_lessons?: number; level?: string };

export const Route = createFileRoute("/learning/my")({
  component: MyCourses,
  head: () => ({ meta: [{ title: "My Courses — Gizmo Office Plus" }] }),
});

function MyCourses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`mycourses-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_purchases", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-purchases"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "research_progress", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["progress-all"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => qc.invalidateQueries({ queryKey: ["courses"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "research" }, () => qc.invalidateQueries({ queryKey: ["research-titles"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);


  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses" as never).select("*");
      return (data ?? []) as unknown as Course[];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_purchases" as never).select("course_id, status").eq("user_id", user!.id).eq("status", "approved");
      return (data ?? []) as { course_id: string; status: string }[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("research_progress").select("research_id, research_type").eq("user_id", user!.id);
      return (data ?? []) as { research_id: string; research_type: string }[];
    },
  });

  const { data: research = [] } = useQuery({
    queryKey: ["research-titles"],
    queryFn: async () => (await supabase.from("research").select("id, research_type")).data ?? [],
  });

  const purchasedIds = new Set(purchases.map((p) => p.course_id));
  const myCourses = courses.filter((c) => purchasedIds.has(c.id));

  const pct = (title: string) => {
    const total = (research as { research_type: string }[]).filter((r) => r.research_type === title).length;
    if (!total) return 0;
    const done = progress.filter((p) => p.research_type === title).length;
    return Math.round((done / total) * 100);
  };

  return (
    <AppShell title="My Courses">
      <div className="p-4 md:p-6">
        {myCourses.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="mt-3 font-semibold">You haven't enrolled in any courses yet</h2>
            <Link to="/learning/all" className="mt-4 inline-block text-sm text-primary hover:underline">Browse all courses</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {myCourses.map((c) => {
              const p = pct(c.title);
              return (
                <Link key={c.id} to="/course/$id" params={{ id: c.id }} className="glass rounded-2xl overflow-hidden hover:glow transition group flex flex-col">
                  <div className="aspect-video bg-muted/30">
                    {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full w-full gradient-bg opacity-30" />}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base line-clamp-2">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.total_lessons ?? 0} Lessons · {c.level ?? "All levels"}</p>
                    <div className="mt-auto pt-3">
                      <Progress value={p} className="h-1.5" />
                      <div className="mt-1 text-xs text-muted-foreground">{p}% complete</div>
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
