import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatDistanceToNow } from "date-fns";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/posts/")({
  component: PostsList,
  head: () => ({ meta: [{ title: "Posts — Gizmo Office Plus" }] }),
});

function PostsList() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => qc.invalidateQueries({ queryKey: ["posts"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: posts = [] } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts" as never).select("id, title, description, header_image_url, created_at").order("created_at", { ascending: false });
      return (data ?? []) as unknown as Array<{ id: string; title: string; description: string | null; header_image_url: string | null; created_at: string }>;
    },
  });

  return (
    <AppShell title="Posts">
      <div className="p-4 md:p-6 max-w-4xl space-y-4">
        {posts.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No posts yet</h2>
          </div>
        ) : posts.map((p) => (
          <Link key={p.id} to="/posts/$id" params={{ id: p.id }} className="block glass-strong rounded-2xl overflow-hidden hover:ring-1 hover:ring-primary transition">
            {p.header_image_url && <img src={p.header_image_url} alt="" className="w-full h-48 object-cover" />}
            <div className="p-4">
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</div>
              <h3 className="font-semibold text-lg mt-1">{p.title}</h3>
              {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
