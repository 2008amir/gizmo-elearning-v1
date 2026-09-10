import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/comments")({
  component: AdminCommentsPage,
  head: () => ({ meta: [{ title: "All Comments — Admin" }] }),
});

function AdminCommentsPage() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin-comments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-all-comments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-comments"],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, research_id, parent_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = comments ?? [];
      const rIds = Array.from(new Set(list.map((c: any) => c.research_id)));
      const uIds = Array.from(new Set(list.map((c: any) => c.user_id)));
      const [{ data: rs }, { data: ps }] = await Promise.all([
        rIds.length ? supabase.from("research").select("id, title").in("id", rIds) : Promise.resolve({ data: [] as any[] }),
        uIds.length ? supabase.from("profiles").select("id, username, first_name, last_name").in("id", uIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const rmap = Object.fromEntries((rs ?? []).map((r: any) => [r.id, r]));
      const pmap = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
      const grouped: Record<string, { research: any; comments: any[] }> = {};
      for (const c of list) {
        const rid = c.research_id;
        if (!grouped[rid]) grouped[rid] = { research: rmap[rid] ?? { id: rid, title: "(unknown)" }, comments: [] };
        grouped[rid].comments.push({ ...c, profile: pmap[c.user_id] });
      }
      return Object.values(grouped);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
        <MessageCircle className="h-6 w-6" /> All Comments by Post
      </h1>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}
      <div className="space-y-6">
        {data?.map((g: any) => (
          <div key={g.research.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Link to="/research/$id" params={{ id: g.research.id }} className="font-semibold hover:text-primary">
                {g.research.title}
              </Link>
              <span className="text-xs text-muted-foreground">{g.comments.length} comment{g.comments.length !== 1 ? "s" : ""}</span>
            </div>
            <ul className="space-y-3">
              {g.comments.map((c: any) => {
                const name = `${c.profile?.first_name ?? ""} ${c.profile?.last_name ?? ""}`.trim() || c.profile?.username || "User";
                return (
                  <li key={c.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{name}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
                    {c.parent_id && <p className="mt-1 text-[10px] text-muted-foreground italic">↳ reply</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
