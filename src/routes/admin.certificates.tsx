import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/certificates")({ component: AdminCerts });

type Row = { id: string; user_id: string; course_id: string; serial: string; issued_at: string; score_pct: number | null };

function AdminCerts() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("admin-certs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates" }, () => qc.invalidateQueries({ queryKey: ["admin-certs"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-certs"],
    queryFn: async () => {
      const { data } = await supabase.from("certificates" as never).select("id,user_id,course_id,serial,issued_at,score_pct").order("issued_at", { ascending: false });
      const list = (data ?? []) as unknown as Row[];
      if (!list.length) return [];
      const uids = Array.from(new Set(list.map((r) => r.user_id)));
      const cids = Array.from(new Set(list.map((r) => r.course_id)));
      const [{ data: profs }, { data: courses }] = await Promise.all([
        supabase.from("profiles").select("id,first_name,last_name,username,avatar_url").in("id", uids),
        supabase.from("courses" as never).select("id,title").in("id", cids),
      ]);
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const cMap = new Map(((courses ?? []) as any[]).map((c) => [c.id, c]));
      return list.map((r) => ({ ...r, profile: pMap.get(r.user_id) as any, course: cMap.get(r.course_id) as any }));
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold gradient-text flex items-center gap-2"><Award className="h-5 w-5" /> Certificates issued</h2>
      {isLoading ? <div className="glass rounded-xl h-40 animate-pulse" /> : rows.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground text-center">No certificates issued yet.</div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase">
              <tr><th className="text-left p-3">Student</th><th className="text-left p-3">Course</th><th className="text-left p-3">Score</th><th className="text-left p-3">Issued</th><th className="text-left p-3">Serial</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="p-3">{r.profile?.first_name} {r.profile?.last_name} <span className="text-xs text-muted-foreground">@{r.profile?.username}</span></td>
                  <td className="p-3">{r.course?.title ?? "—"}</td>
                  <td className="p-3">{r.score_pct != null ? `${Number(r.score_pct).toFixed(0)}%` : "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{format(new Date(r.issued_at), "PP")}</td>
                  <td className="p-3 font-mono text-xs">{r.serial}</td>
                  <td className="p-3"><Link to={"/u/$username" as never} params={{ username: r.profile?.username } as any} className="inline-flex items-center gap-1 text-primary text-xs hover:underline">View <ExternalLink className="h-3 w-3" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
