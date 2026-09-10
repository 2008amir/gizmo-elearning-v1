import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Award, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderCertificate, downloadCertificatePdf } from "@/lib/certificate";

export const Route = createFileRoute("/certificates")({
  component: Certificates,
  head: () => ({ meta: [{ title: "Certificates — Gizmo Office Plus" }] }),
});

function Certificates() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`certs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-certs"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: certs = [] } = useQuery({
    queryKey: ["my-certs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("certificates" as never).select("id, course_id, issued_at, serial, score_pct").eq("user_id", user!.id);
      const rows = (data ?? []) as { id: string; course_id: string; issued_at: string; serial: string; score_pct: number | null }[];
      if (!rows.length) return [];
      const courseIds = rows.map((r) => r.course_id);
      const [{ data: courses }, { data: enrolls }] = await Promise.all([
        supabase.from("courses" as never).select("id, title, image_url").in("id", courseIds),
        supabase.from("course_enrollments").select("course_id, created_at").eq("user_id", user!.id).in("course_id", courseIds),
      ]);
      const cMap = new Map(((courses ?? []) as any[]).map((c) => [c.id, c]));
      const eMap = new Map<string, string>();
      ((enrolls ?? []) as any[]).forEach((e) => {
        const prev = eMap.get(e.course_id);
        if (!prev || new Date(e.created_at) < new Date(prev)) eMap.set(e.course_id, e.created_at);
      });
      return rows.map((r) => ({ ...r, course: cMap.get(r.course_id) as any, start_date: eMap.get(r.course_id) ?? null }));
    },
  });

  return (
    <AppShell title="Certificates">
      <div className="p-4 md:p-6 max-w-5xl">
        {certs.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Award className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No certificates yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complete a course 100% to earn a certificate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {certs.map((c: any) => (
              <CertificateCard
                key={c.id}
                fullName={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Student"}
                username={profile?.username ?? ""}
                courseTitle={c.course?.title ?? "Course"}
                serial={c.serial}
                issuedAt={c.issued_at}
                startDate={c.start_date}
                scorePct={c.score_pct}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CertificateCard({ fullName, username, courseTitle, serial, issuedAt, startDate, scorePct }: {
  fullName: string; username: string; courseTitle: string; serial: string; issuedAt: string; startDate: string | null; scorePct: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const level = scorePct != null && Number(scorePct) >= 85 ? "Upper Class" : "Lower Class";
  const verifyUrl = typeof window !== "undefined" && username
    ? `${window.location.origin}/c/${username}/${serial}`
    : "";

  const info = { fullName, courseTitle, serial, issuedAt, startDate, scorePct, verifyUrl, level } as const;

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;
    renderCertificate(canvasRef.current, info).then(() => setReady(true)).catch(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, courseTitle, serial, issuedAt, startDate, scorePct, username]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadCertificatePdf(info, `certificate-${serial}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-4 space-y-3">
      <canvas ref={canvasRef} className="w-full h-auto rounded-lg bg-white" />
      <Button className="w-full gradient-bg text-primary-foreground" disabled={!ready || downloading} onClick={handleDownload}>
        {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        Download PDF
      </Button>
    </div>
  );
}
