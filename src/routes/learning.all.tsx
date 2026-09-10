import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Clock, Crown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CoursePaywall, type Purchase } from "@/components/CoursePaywall";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type Course = { id: string; title: string; description: string; image_url: string | null; price: number; purchase_enabled: boolean };

export const Route = createFileRoute("/learning/all")({
  component: AllCourses,
  head: () => ({ meta: [{ title: "All Courses — Gizmo Office Plus" }] }),
});

function AllCourses() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [paywallCourse, setPaywallCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`purchases-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_purchases", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-purchases", user.id] }))
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

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-purchases", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_purchases" as never).select("id, course_id, status, receipt_url, bank_name, account_name").eq("user_id", user!.id);
      return (data ?? []) as unknown as Purchase[];
    },
  });

  const purchaseByCourse = useMemo(() => {
    const m = new Map<string, Purchase>();
    const rank = (s: string) => (s === "approved" ? 3 : s === "pending" ? 2 : 1);
    for (const p of purchases) {
      const ex = m.get(p.course_id);
      if (!ex || rank(p.status) > rank(ex.status)) m.set(p.course_id, p);
    }
    return m;
  }, [purchases]);

  const courseUnlocked = (c: Course) => isAdmin || !c.purchase_enabled || purchaseByCourse.get(c.id)?.status === "approved";

  const handleClick = (c: Course) => {
    if (courseUnlocked(c)) { navigate({ to: "/course/$id", params: { id: c.id } }); return; }
    setPaywallCourse(c);
  };

  const q = search.trim().toLowerCase();
  const filtered = q ? courses.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)) : courses;

  return (
    <AppShell title="All Courses" search={search} onSearchChange={setSearch} searchPlaceholder="Search courses...">
      <div className="p-4 md:p-6">
        {filtered.length === 0 ? (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <h2 className="text-lg font-semibold">No courses found</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((c) => {
              const unlocked = courseUnlocked(c);
              const pending = purchaseByCourse.get(c.id)?.status === "pending";
              return (
                <button key={c.id} onClick={() => handleClick(c)} className="text-left glass rounded-2xl overflow-hidden hover:glow transition group flex flex-col relative">
                  <div className="aspect-video bg-muted/30 relative">
                    {c.image_url ? <img src={c.image_url} alt={c.title} className={cn("h-full w-full object-cover group-hover:scale-105 transition-transform", !unlocked && "opacity-50 grayscale")} /> : <div className="h-full w-full gradient-bg opacity-30" />}
                    <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-background/70 backdrop-blur px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1">
                      {c.purchase_enabled ? <><Crown className="h-3 w-3" /> Premium · ₦{Number(c.price).toLocaleString()}</> : "Course"}
                    </span>
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                        <div className="h-16 w-16 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-lg">
                          {pending ? <Clock className="h-7 w-7 text-amber-500" /> : <Lock className="h-7 w-7 text-muted-foreground" />}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base line-clamp-2">{c.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{c.description}</p>
                    {pending && <span className="mt-3 text-xs text-amber-500 font-medium">Under review</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {paywallCourse && (
        <CoursePaywall course={{ id: paywallCourse.id, title: paywallCourse.title, price: paywallCourse.price }} purchase={purchaseByCourse.get(paywallCourse.id) ?? null} onClose={() => setPaywallCourse(null)} />
      )}
    </AppShell>
  );
}
