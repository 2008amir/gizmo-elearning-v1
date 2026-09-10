import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/posts/$id")({
  component: PostView,
  head: () => ({ meta: [{ title: "Post — Gizmo Office Plus" }] }),
});

function PostView() {
  const { id } = Route.useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await supabase.from("posts" as never).select("*").eq("id", id).maybeSingle();
      return data as unknown as { id: string; title: string; description: string | null; header_image_url: string | null; content_html: string | null; created_at: string } | null;
    },
  });

  return (
    <AppShell title="Post">
      <div className="p-4 md:p-6 max-w-3xl">
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : !post ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Post not found.</div>
        ) : (
          <article className="glass-strong rounded-2xl overflow-hidden">
            {post.header_image_url && <img src={post.header_image_url} alt="" className="w-full h-64 object-cover" />}
            <div className="p-6">
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</div>
              <h1 className="text-2xl font-bold gradient-text mt-2">{post.title}</h1>
              {post.description && <p className="mt-2 text-muted-foreground">{post.description}</p>}
              {post.content_html && (
                <div className="prose prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: post.content_html }} />
              )}
            </div>
          </article>
        )}
      </div>
    </AppShell>
  );
}
