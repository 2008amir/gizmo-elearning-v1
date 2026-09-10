import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderCertificate, downloadCanvas } from "@/lib/certificate";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfile,
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — Gizmo Office Plus` }] }),
});

function PublicProfile() {
  const { username } = Route.useParams();
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => (await supabase.from("public_profiles" as never).select("*").eq("username", username).maybeSingle()).data as any,
  });

  const { data: certs = [] } = useQuery({
    queryKey: ["public-certs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("certificates" as never).select("id,serial,issued_at,score_pct,course_id").eq("user_id", profile.id).order("issued_at", { ascending: false });
      const list = ((data ?? []) as any[]);
      if (!list.length) return list;
      const { data: cs } = await supabase.from("courses" as never).select("id,title").in("id", list.map((c) => c.course_id));
      const m = new Map(((cs ?? []) as any[]).map((c) => [c.id, c.title]));
      return list.map((c) => ({ ...c, course_title: m.get(c.course_id) ?? "Course" }));
    },
  });

  useEffect(() => {
    if (qrRef.current && typeof window !== "undefined") {
      QRCode.toCanvas(qrRef.current, window.location.href, { width: 128, margin: 1 }).catch(() => {});
    }
  }, [profile]);

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.username;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="glass-strong rounded-2xl p-6 text-center">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">Verified student</div>
          <div className="mt-1 text-xs text-muted-foreground">Gizmo Office Plus //CODEBREAKERS</div>
          {profile.avatar_url && <img src={profile.avatar_url} alt="" className="h-24 w-24 rounded-full mx-auto mt-4 object-cover ring-2 ring-primary" />}
          <h1 className="mt-3 text-2xl font-bold">{fullName}</h1>
          <div className="text-sm text-muted-foreground">@{profile.username}</div>
          <canvas ref={qrRef} className="mx-auto mt-4 rounded" />
        </div>

        <div>
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Award className="h-4 w-4" /> Certificates</h2>
          {certs.length === 0 ? (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">No certificates yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certs.map((c: any) => (
                <PublicCertCard
                  key={c.id}
                  fullName={fullName}
                  username={profile.username}
                  courseTitle={c.course_title}
                  serial={c.serial}
                  issuedAt={c.issued_at}
                  scorePct={c.score_pct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PublicCertCard({ fullName, username, courseTitle, serial, issuedAt, scorePct }: {
  fullName: string; username: string; courseTitle: string; serial: string; issuedAt: string; scorePct: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;
    const verifyUrl = `${window.location.origin}/c/${username}/${serial}`;
    renderCertificate(canvasRef.current, { fullName, courseTitle, serial, issuedAt, scorePct, verifyUrl }).then(() => setReady(true));
  }, [fullName, username, courseTitle, serial, issuedAt, scorePct]);

  return (
    <div className="glass rounded-xl p-3 space-y-2">
      <canvas ref={canvasRef} className="w-full h-auto rounded-lg bg-slate-900" />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{courseTitle}</div>
          <div className="text-[11px] text-muted-foreground">Serial {serial}</div>
        </div>
        <Button size="sm" variant="outline" disabled={!ready}
          onClick={() => canvasRef.current && downloadCanvas(canvasRef.current, `certificate-${serial}.png`)}>
          <Download className="h-3 w-3 mr-1" /> PNG
        </Button>
      </div>
    </div>
  );
}
