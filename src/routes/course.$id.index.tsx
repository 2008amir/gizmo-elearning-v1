import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Award, Clock, Crown, Play, Star, BookOpen, Bookmark, CheckCircle2, Lock, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CoursePaywall, type Purchase } from "@/components/CoursePaywall";

export const Route = createFileRoute("/course/$id/")({
  component: CourseDetail,
  head: () => ({ meta: [{ title: "Course — Gizmo Office Plus" }] }),
});

type Course = {
  id: string; title: string; description: string | null; image_url: string | null; price: number;
  purchase_enabled: boolean; level?: string; total_lessons?: number; duration_minutes?: number;
  rating_avg?: number; rating_count?: number; certificate_enabled?: boolean;
  overview?: string | null; learn_points?: string[] | null; instructor_id?: string | null;
};

type Section = { id: string; title: string; description: string | null; order_index: number };
type Lesson = { id: string; title: string; description?: string | null; header_image_url?: string | null; section_id: string | null; order_index: number; duration_minutes: number };
type Review = { id: string; user_id: string; rating: number; body: string | null; created_at: string; profile?: { first_name: string; last_name: string; avatar_url: string | null } };
type Instructor = { id: string; name: string; title: string | null; bio: string | null; avatar_url: string | null };

function CourseDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [paywall, setPaywall] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReview, setNewReview] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const ch = supabase.channel(`course-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_reviews", filter: `course_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["course-reviews", id] });
        qc.invalidateQueries({ queryKey: ["course", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "research_progress" }, () => {
        qc.invalidateQueries({ queryKey: ["progress-course"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "research" }, () => {
        qc.invalidateQueries({ queryKey: ["course-lessons"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_attempts" }, () => {
        qc.invalidateQueries({ queryKey: ["my-exam-attempt"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);


  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data } = await supabase.from("courses" as never).select("*").eq("id", id).maybeSingle();
      return data as unknown as Course | null;
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["course-sections", id],
    queryFn: async () => (await supabase.from("course_sections" as never).select("*").eq("course_id", id).order("order_index")).data as unknown as Section[] ?? [],
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["course-lessons", course?.title],
    enabled: !!course,
    queryFn: async () => (await supabase.from("research").select("id, title, description, header_image_url, section_id, order_index, duration_minutes").eq("research_type", course!.title).order("order_index")).data as unknown as Lesson[] ?? [],
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["course-reviews", id],
    queryFn: async () => {
      const { data } = await supabase.from("course_reviews" as never).select("id, user_id, rating, body, created_at").eq("course_id", id).order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as Review[];
      if (rows.length === 0) return rows;
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) as any }));
    },
  });

  const { data: instructor } = useQuery({
    queryKey: ["instructor", course?.instructor_id],
    enabled: !!course?.instructor_id,
    queryFn: async () => (await supabase.from("instructors" as never).select("*").eq("id", course!.instructor_id!).maybeSingle()).data as unknown as Instructor | null,
  });

  const { data: purchase } = useQuery({
    queryKey: ["my-purchase-course", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("course_purchases" as never).select("id, course_id, status, receipt_url, bank_name, account_name").eq("user_id", user!.id).eq("course_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as unknown as Purchase | null;
    },
  });

  const { data: progressRows = [] } = useQuery({
    queryKey: ["progress-course", user?.id, course?.title],
    enabled: !!user && !!course,
    queryFn: async () => (await supabase.from("research_progress").select("research_id, created_at").eq("user_id", user!.id).eq("research_type", course!.title)).data as { research_id: string; created_at: string }[] ?? [],
  });

  const completedIds = useMemo(() => new Set(progressRows.map((p) => p.research_id)), [progressRows]);
  const completedToday = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return progressRows.filter((p) => p.created_at && new Date(p.created_at) >= start).length;
  }, [progressRows]);
  const remainingToday = Math.max(0, 3 - completedToday);
  const actualLessonCount = lessons.length;
  const totalLessons = actualLessonCount > 0 ? actualLessonCount : (course?.total_lessons ?? 0);
  const progressPct = totalLessons ? Math.min(100, Math.round((completedIds.size / totalLessons) * 100)) : 0;
  const readyForExam = actualLessonCount > 0 && completedIds.size >= actualLessonCount;


  const { data: myAttempt } = useQuery({
    queryKey: ["my-exam-attempt", user?.id, id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("exam_attempts" as never).select("*").eq("user_id", user!.id).eq("course_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle()).data as any,
  });

  const unlocked = isAdmin || !course?.purchase_enabled || purchase?.status === "approved";

  const lessonsBySection = useMemo(() => {
    const map = new Map<string | null, Lesson[]>();
    for (const l of lessons) {
      const k = l.section_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(l);
    }
    return map;
  }, [lessons]);

  const orderedLessons = useMemo(() => {
    if (sections.length === 0) return lessons;
    const flat: Lesson[] = [];
    for (const s of sections) flat.push(...(lessonsBySection.get(s.id) ?? []));
    flat.push(...(lessonsBySection.get(null) ?? []));
    return flat;
  }, [sections, lessonsBySection, lessons]);

  const lessonUnlocked = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!unlocked) { orderedLessons.forEach((l) => map.set(l.id, false)); return map; }
    if (isAdmin) { orderedLessons.forEach((l) => map.set(l.id, true)); return map; }
    let sawIncomplete = false;
    for (const l of orderedLessons) {
      if (completedIds.has(l.id)) { map.set(l.id, true); continue; }
      if (!sawIncomplete) { map.set(l.id, remainingToday > 0); sawIncomplete = true; }
      else map.set(l.id, false);
    }
    return map;
  }, [orderedLessons, completedIds, unlocked, isAdmin, remainingToday]);

  const openLesson = (lid: string) => {
    if (!lessonUnlocked.get(lid)) {
      if (unlocked && remainingToday === 0 && !completedIds.has(lid)) {
        toast.info("Daily limit reached — you can complete up to 3 lessons per day. Come back tomorrow.");
      } else {
        toast.info("Complete the previous lesson to unlock this one.");
      }
      return;
    }
    navigate({ to: "/research/$id", params: { id: lid } });
  };

  const totalMinutes = course?.duration_minutes || lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remMin = totalMinutes % 60;

  const submitReview = async () => {
    if (!user) return;
    const { error } = await supabase.from("course_reviews" as never).upsert({ user_id: user.id, course_id: id, rating: newRating, body: newReview } as never, { onConflict: "user_id,course_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Review submitted");
    setNewReview("");
    qc.invalidateQueries({ queryKey: ["course-reviews", id] });
  };

  const startLearning = async () => {
    if (!unlocked) { setPaywall(true); return; }
    if (user) {
      await supabase.from("course_enrollments" as never).upsert({ user_id: user.id, course_id: id, last_accessed_at: new Date().toISOString() } as never, { onConflict: "user_id,course_id" });
    }
    setTab("curriculum");
    setTimeout(() => document.getElementById("curriculum-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (!course) {
    return <AppShell title="Course"><div className="p-6 text-sm text-muted-foreground">Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto pb-24">
        {/* Back */}
        <div className="px-4 md:px-6 pt-4">
          <button onClick={() => navigate({ to: "/dashboard" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        {/* Hero */}
        <div className="p-4 md:p-6">
          <div className="rounded-3xl overflow-hidden aspect-video bg-muted/30 relative">
            {course.image_url ? <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="h-full w-full gradient-bg opacity-30" />}
            {!unlocked && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-background/90 border border-border flex items-center justify-center shadow-lg">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">{course.title}</h1>
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{Number(course.rating_avg || 0).toFixed(1)}</span>
                <span className="text-muted-foreground">({course.rating_count || 0} reviews)</span>
              </div>
            </div>
            {course.purchase_enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full shrink-0">
                <Crown className="h-3 w-3" /> Premium
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<BookOpen className="h-4 w-4" />} value={String(lessons.length)} label="Lessons" />
            <Stat icon={<Clock className="h-4 w-4" />} value={`${totalHours}h ${remMin}m`} label="Total length" />
            <Stat icon={<Bookmark className="h-4 w-4" />} value={course.level || "All"} label="Level" />
            <Stat icon={<Award className="h-4 w-4" />} value={course.certificate_enabled ? "Yes" : "—"} label="Certificate" />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 mt-5">
              <div>
                <h3 className="font-bold text-lg">Overview</h3>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{course.overview || course.description}</p>
              </div>
              {Array.isArray(course.learn_points) && course.learn_points.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-bold">What you'll learn</h3>
                  <ul className="mt-3 space-y-2">
                    {course.learn_points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {user && unlocked && (
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">Your progress</h3>
                    <span className="text-sm font-bold">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}
              {readyForExam && course.certificate_enabled !== false && (
                <div className="rounded-2xl p-5 border border-primary bg-primary/10">
                  <div className="font-bold text-lg">🎉 Congratulations!</div>
                  <p className="text-sm text-muted-foreground mt-1">You've completed all {totalLessons} lessons. Start the final exam to earn your certificate.</p>
                  {myAttempt?.passed ? (
                    <div className="mt-3 text-sm text-emerald-500 font-semibold">You passed with {Number(myAttempt.score_pct).toFixed(0)}% — certificate issued.</div>
                  ) : (
                    <Link to="/course/$id/exam" params={{ id }} className="mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 gradient-bg text-primary-foreground font-medium hover:opacity-90">
                      <Play className="h-4 w-4 fill-current" /> Start exam for your certificate
                    </Link>
                  )}
                </div>
              )}
            </TabsContent>

            <div id="curriculum-anchor" />


            <TabsContent value="curriculum" className="mt-5 space-y-4">
              {unlocked && !isAdmin && (
                <div className="text-xs text-muted-foreground px-1">
                  Daily limit: {Math.min(completedToday, 3)}/3 lessons completed today.
                  {remainingToday === 0 && " Come back tomorrow to continue."}
                </div>
              )}
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lessons published yet.</p>
              ) : sections.length === 0 ? (
                <CurriculumList lessons={lessons} completedIds={completedIds} isUnlocked={(id) => !!lessonUnlocked.get(id)} onOpen={openLesson} />
              ) : (
                <>
                  {sections.map((s) => (
                    <div key={s.id} className="glass rounded-2xl p-4">
                      <div className="font-semibold">{s.title}</div>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                      <div className="mt-3">
                        <CurriculumList lessons={lessonsBySection.get(s.id) ?? []} completedIds={completedIds} isUnlocked={(id) => !!lessonUnlocked.get(id)} onOpen={openLesson} />
                      </div>
                    </div>
                  ))}
                  {(lessonsBySection.get(null)?.length ?? 0) > 0 && (
                    <div className="glass rounded-2xl p-4">
                      <div className="font-semibold">Additional lessons</div>
                      <div className="mt-3"><CurriculumList lessons={lessonsBySection.get(null)!} completedIds={completedIds} isUnlocked={(id) => !!lessonUnlocked.get(id)} onOpen={openLesson} /></div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>


            <TabsContent value="reviews" className="mt-5 space-y-4">
              {user && unlocked && (
                <div className="glass rounded-2xl p-4">
                  <div className="text-sm font-semibold">Leave a review</div>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setNewRating(n)}>
                        <Star className={cn("h-6 w-6", n <= newRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={newReview} onChange={(e) => setNewReview(e.target.value)} placeholder="Share your experience..." className="mt-3" />
                  <Button onClick={submitReview} className="mt-3">Submit review</Button>
                </div>
              )}
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="glass rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarImage src={r.profile?.avatar_url ?? undefined} /><AvatarFallback>{r.profile?.first_name?.[0] ?? "U"}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{r.profile?.first_name} {r.profile?.last_name}</div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("h-3 w-3", n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />)}
                          </div>
                        </div>
                      </div>
                      {r.body && <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-[var(--sidebar-width)] bg-background/95 backdrop-blur border-t border-border p-3 md:p-4 z-20">
          <div className="max-w-5xl mx-auto">
            <Button onClick={startLearning} size="lg" className="w-full gradient-bg text-primary-foreground hover:opacity-90 h-12">
              <Play className="h-5 w-5 mr-2 fill-current" />
              {progressPct > 0 && progressPct < 100 ? "Continue learning" : progressPct >= 100 ? "Review course" : "Start learning"}
            </Button>
          </div>
        </div>
      </div>


      {paywall && course.purchase_enabled && (
        <CoursePaywall course={{ id: course.id, title: course.title, price: course.price }} purchase={purchase ?? null} onClose={() => setPaywall(false)} />
      )}
    </AppShell>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</div>
      <div className="font-bold text-sm mt-1">{value}</div>
    </div>
  );
}

function CurriculumList({ lessons, completedIds, isUnlocked, onOpen }: {
  lessons: Lesson[]; completedIds: Set<string>; isUnlocked: (id: string) => boolean; onOpen: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {lessons.map((l) => {
        const done = completedIds.has(l.id);
        const unlocked = isUnlocked(l.id);
        return (
          <li key={l.id}>
            <button
              onClick={() => onOpen(l.id)}
              className={cn(
                "w-full flex items-center gap-3 py-2 px-2 text-left transition rounded-xl",
                unlocked ? "hover:bg-muted/20" : "opacity-70 cursor-not-allowed"
              )}
            >
              {/* Image with lock/unlock overlay */}
              <div className="relative shrink-0 h-16 w-16 rounded-xl overflow-hidden bg-muted/40">
                {l.header_image_url ? (
                  <img src={l.header_image_url} alt="" className={cn("h-full w-full object-cover", !unlocked && "grayscale")} />
                ) : (
                  <div className="h-full w-full gradient-bg opacity-40" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  {unlocked ? (
                    <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-3 w-3 text-black fill-current" />
                    </div>
                  ) : (
                    <Lock className="h-5 w-5 text-white drop-shadow" />
                  )}
                </div>
              </div>

              {/* Title + description */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold line-clamp-1">{l.title}</div>
                {l.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{l.description}</div>
                )}
                <div className="text-[11px] text-muted-foreground mt-0.5">{l.duration_minutes || 10} min</div>
              </div>

              {/* Done / lock status */}
              <div className="shrink-0 pl-2">
                {done ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </span>
                ) : !unlocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <span className="text-[11px] text-muted-foreground">—</span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

