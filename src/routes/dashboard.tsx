import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { BookOpen, Crown, LayoutGrid, TrendingUp, ArrowRight, PlayCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Gizmo Office Plus" }] }),
});

type Course = {
  id: string; title: string; description: string; image_url: string | null;
  price: number; purchase_enabled: boolean; category?: string | null;
  featured?: boolean; level?: string; total_lessons?: number; duration_minutes?: number;
};

function Dashboard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`dash-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => qc.invalidateQueries({ queryKey: ["courses"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "research" }, () => qc.invalidateQueries({ queryKey: ["research-titles"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "research_progress", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["progress-all"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "course_enrollments", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-enrollments"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "course_purchases", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);


  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses" as never).select("*").order("created_at", { ascending: true });
      return (data ?? []) as unknown as Course[];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_enrollments" as never).select("course_id, last_accessed_at").eq("user_id", user!.id);
      return (data ?? []) as { course_id: string; last_accessed_at: string }[];
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
    queryFn: async () => {
      const { data } = await supabase.from("research").select("id, research_type");
      return (data ?? []) as { id: string; research_type: string }[];
    },
  });

  const categories = useMemo(() => {
    const buckets = new Map<string, number>();
    buckets.set("All Courses", courses.length);
    for (const c of courses) {
      const key = c.category || "General";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    buckets.set("Premium", courses.filter((c) => c.purchase_enabled).length);
    return Array.from(buckets.entries());
  }, [courses]);

  const featured = useMemo(() => courses.find((c) => c.featured) ?? courses.find((c) => c.purchase_enabled) ?? courses[0], [courses]);

  const courseProgress = (courseTitle: string) => {
    const total = research.filter((r) => r.research_type === courseTitle).length;
    if (!total) return 0;
    const done = progress.filter((p) => p.research_type === courseTitle).length;
    return Math.round((done / total) * 100);
  };

  const enrolledCourses = courses.filter((c) => enrollments.some((e) => e.course_id === c.id));
  const overallProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((a, c) => a + courseProgress(c.title), 0) / enrolledCourses.length)
    : 0;

  return (
    <AppShell title={`Welcome back, ${profile?.first_name || "learner"}`}>
      <div className="p-4 md:p-6 space-y-8 max-w-6xl">
        {/* Browse categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold">Browse categories</h2>
            <Link to="/learning/all" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
            {categories.map(([name, count], idx) => (
              <Link
                key={name}
                to="/learning/all"
                className="snap-start shrink-0 w-32 h-32 rounded-2xl glass p-4 flex flex-col justify-between hover:glow transition group"
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  idx % 4 === 0 && "bg-primary/15 text-primary",
                  idx % 4 === 1 && "bg-purple-500/15 text-purple-400",
                  idx % 4 === 2 && "bg-emerald-500/15 text-emerald-400",
                  idx % 4 === 3 && "bg-amber-500/15 text-amber-400",
                )}>
                  {name === "Premium" ? <Crown className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-semibold text-sm line-clamp-1">{name}</div>
                  <div className="text-[11px] text-muted-foreground">{count} courses</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured course */}
        {featured && (
          <section>
            <h2 className="text-lg md:text-xl font-bold mb-3">Featured course</h2>
            <Link to="/course/$id" params={{ id: featured.id }} className="block glass-strong rounded-2xl overflow-hidden hover:glow transition group">
              <div className="grid md:grid-cols-2">
                <div className="p-5 md:p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold">{featured.title}</h3>
                    {featured.purchase_enabled && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 px-2 py-1 rounded-full">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground">
                    View course <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="aspect-video md:aspect-auto md:h-full bg-muted/30 overflow-hidden">
                  {featured.image_url ? (
                    <img src={featured.image_url} alt={featured.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  ) : <div className="h-full w-full gradient-bg opacity-30" />}
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* My progress */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold">My progress</h2>
            <Link to="/learning/my" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Keep learning!</div>
              <div className="text-xs text-muted-foreground">You're making great progress</div>
              <Progress value={overallProgress} className="mt-2 h-1.5" />
            </div>
            <div className="text-lg font-bold">{overallProgress}%</div>
          </div>
        </section>

        {/* Continue learning */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold">Continue learning</h2>
            <Link to="/learning/my" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {enrolledCourses.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No courses in progress yet.</p>
              <Link to="/learning/all" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Browse courses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrolledCourses.slice(0, 4).map((c) => {
                const pct = courseProgress(c.title);
                return (
                  <Link key={c.id} to="/course/$id" params={{ id: c.id }} className="glass rounded-2xl p-4 flex items-center gap-4 hover:glow transition">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted/30 shrink-0">
                      {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <PlayCircle className="h-full w-full p-3 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">{c.total_lessons ?? 0} Lessons · {c.level ?? "All levels"}</div>
                      <Progress value={pct} className="mt-2 h-1.5" />
                    </div>
                    <div className="text-sm font-bold">{pct}%</div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
