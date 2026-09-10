import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/admin/exams")({ component: AdminExamsLayout });

function AdminExamsLayout() {
  const location = useLocation();
  if (location.pathname !== "/admin/exams") return <Outlet />;
  return <AdminExams />;
}

function AdminExams() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-exams-courses"],
    queryFn: async () => {
      const { data: cs } = await supabase.from("courses" as never).select("id,title,image_url").order("created_at", { ascending: false });
      const list = ((cs ?? []) as any[]);
      if (!list.length) return list;
      const { data: qs } = await supabase.from("exam_questions" as never).select("course_id");
      const counts = new Map<string, number>();
      for (const q of (qs ?? []) as any[]) counts.set(q.course_id, (counts.get(q.course_id) ?? 0) + 1);
      return list.map((c) => ({ ...c, questionCount: counts.get(c.id) ?? 0 }));
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold gradient-text">Exam question banks</h2>
      {isLoading ? <div className="glass rounded-xl h-40 animate-pulse" /> : courses.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">No courses yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((c: any) => (
            <Link key={c.id} to={"/admin/exams/$courseId" as never} params={{ courseId: c.id } as any} className="glass rounded-2xl p-4 hover:ring-1 hover:ring-primary transition flex items-center gap-3">
              {c.image_url ? <img src={c.image_url} alt="" className="h-14 w-20 object-cover rounded-lg" /> : <div className="h-14 w-20 rounded-lg gradient-bg opacity-40" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><BookOpen className="h-3 w-3" /> {c.questionCount} questions</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
