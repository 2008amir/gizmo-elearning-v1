import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Loader2, ShieldCheck, User, BookOpen, MapPin, Calendar, GraduationCap, Trophy } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/c/$username/$serial")({
  component: PublicCertificatePage,
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.serial} — Gizmo Office Plus` },
      { name: "description", content: "Verified certificate of completion." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type CertPayload = {
  serial: string;
  issued_at: string;
  score_pct: number | null;
  grade: string | null;
  start_date: string | null;
  end_date: string;
  user: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    avatar_url: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
  };
  course: {
    title: string | null;
    image_url: string | null;
    total_lessons: number | null;
  };
};

function PublicCertificatePage() {
  const { username, serial } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["public-cert", username, serial],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_certificate" as never, { _username: username, _serial: serial } as never);
      if (error) throw error;
      return data as unknown as CertPayload | null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
          <p className="mt-3 text-sm text-slate-400">Verifying certificate…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 px-4">
        <div className="max-w-md w-full text-center border border-slate-800 rounded-2xl p-8 bg-slate-900/60">
          <Award className="h-10 w-10 mx-auto text-slate-500" />
          <h1 className="mt-4 text-lg font-semibold">Certificate not found</h1>
          <p className="mt-2 text-sm text-slate-400">We couldn't verify this serial. It may be invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  const fullName = `${data.user.first_name ?? ""} ${data.user.last_name ?? ""}`.trim() || data.user.username || "Student";
  const gradeColor = data.grade === "Upper Class" ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                                                  : "text-amber-400 border-amber-500/40 bg-amber-500/10";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Verified Certificate
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            GIZMO OFFICE PLUS
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mt-1">// CODEBREAKERS //</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-800">
            {data.user.avatar_url ? (
              <img src={data.user.avatar_url} alt="" className="h-28 w-28 rounded-full object-cover ring-2 ring-amber-500/60" />
            ) : (
              <div className="h-28 w-28 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-amber-500/60">
                <User className="h-10 w-10 text-slate-500" />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-sm text-slate-400">@{data.user.username}</p>
              {data.grade && (
                <span className={`inline-flex items-center gap-1 mt-3 text-xs font-semibold px-3 py-1 rounded-full border ${gradeColor}`}>
                  <Trophy className="h-3 w-3" /> {data.grade}
                  {data.score_pct != null && <span className="ml-1 opacity-80">· {Number(data.score_pct).toFixed(0)}%</span>}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold uppercase tracking-wider">
              <BookOpen className="h-4 w-4" /> Course
            </div>
            <h3 className="mt-1 text-xl font-semibold">{data.course.title ?? "—"}</h3>
            {data.course.total_lessons != null && (
              <p className="text-sm text-slate-400 mt-1">Total lessons: {data.course.total_lessons}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Start date"
              value={data.start_date ? format(new Date(data.start_date), "PPP") : "—"} />
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="End date"
              value={format(new Date(data.end_date), "PPP")} />
            <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Exam score"
              value={data.score_pct != null ? `${Number(data.score_pct).toFixed(0)}%` : "—"} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Country" value={data.user.country || "—"} />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Serial</span>
            <span className="font-mono text-slate-300">{data.serial.toUpperCase()}</span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          This certificate was issued and cryptographically referenced by Gizmo Office Plus.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="mt-1 text-sm text-slate-100 break-words">{value}</div>
    </div>
  );
}
