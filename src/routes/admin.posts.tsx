import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/posts")({
  component: AdminPosts,
  head: () => ({ meta: [{ title: "Posts — Admin" }] }),
});

function AdminPosts() {
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("admin-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => qc.invalidateQueries({ queryKey: ["admin-posts"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data: posts = [] } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data } = await supabase.from("posts" as never).select("id, title, description, header_image_url, created_at").order("created_at", { ascending: false });
      return (data ?? []) as unknown as Array<{ id: string; title: string; description: string | null; header_image_url: string | null; created_at: string }>;
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts" as never).delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Posts</h1>
        <Link to="/admin/research/new" search={{ template: "post" }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md gradient-bg text-primary-foreground text-sm font-medium">
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No posts yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create one from Add Research and set the course to "Post".</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <div key={p.id} className="glass-strong rounded-2xl p-4 flex gap-4 items-start">
              {p.header_image_url && <img src={p.header_image_url} alt="" className="h-20 w-28 object-cover rounded-md shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</div>
                <Link to="/posts/$id" params={{ id: p.id }} className="font-semibold hover:underline">{p.title}</Link>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
