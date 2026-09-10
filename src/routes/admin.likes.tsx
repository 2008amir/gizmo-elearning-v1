import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/admin/likes")({
  component: AdminLikesPage,
  head: () => ({ meta: [{ title: "All Likes — Admin" }] }),
});

function AdminLikesPage() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin-likes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-all-comment-likes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-all-comment-likes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-all-comment-likes"],
    queryFn: async () => {
      const { data: cl, error } = await supabase
        .from("comment_likes")
        .select("user_id, comment_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = cl ?? [];
      const cIds = Array.from(new Set(list.map((l: any) => l.comment_id)));
      const uIds = Array.from(new Set(list.map((l: any) => l.user_id)));
      const [{ data: cs }, { data: ps }] = await Promise.all([
        cIds.length ? supabase.from("comments").select("id, content, research_id").in("id", cIds) : Promise.resolve({ data: [] as any[] }),
        uIds.length ? supabase.from("profiles").select("id, username, first_name, last_name").in("id", uIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const rIds = Array.from(new Set((cs ?? []).map((c: any) => c.research_id)));
      const { data: rs } = rIds.length
        ? await supabase.from("research").select("id, title").in("id", rIds)
        : { data: [] as any[] };
      const cmap = Object.fromEntries((cs ?? []).map((c: any) => [c.id, c]));
      const pmap = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
      const rmap = Object.fromEntries((rs ?? []).map((r: any) => [r.id, r]));
      return list.map((l: any) => {
        const c = cmap[l.comment_id];
        return {
          ...l,
          comment: c,
          research: c ? rmap[c.research_id] : null,
          profile: pmap[l.user_id],
        };
      });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
        <Heart className="h-6 w-6" /> Comment Likes
      </h1>
      <p className="text-sm text-muted-foreground">Every like received on a comment.</p>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (!data || data.length === 0) && (
        <p className="text-sm text-muted-foreground">No likes yet.</p>
      )}
      <ul className="space-y-3">
        {data?.map((l: any, i: number) => {
          const name = `${l.profile?.first_name ?? ""} ${l.profile?.last_name ?? ""}`.trim() || l.profile?.username || "User";
          return (
            <li key={`${l.user_id}-${l.comment_id}-${i}`} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span><span className="font-semibold text-foreground">{name}</span> liked a comment</span>
                <span>{new Date(l.created_at).toLocaleString()}</span>
              </div>
              {l.comment && (
                <p className="mt-1 text-sm text-foreground/80 line-clamp-2">"{l.comment.content}"</p>
              )}
              {l.research && (
                <Link to="/research/$id" params={{ id: l.research.id }} className="text-xs text-primary hover:underline mt-1 inline-block">
                  on: {l.research.title}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
