import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Saved Research — Gizmo Office Plus" }] }),
});

function SavedPage() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: savedItems = [], isLoading } = useQuery({
    queryKey: ["saved-research", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("saved_research").select("research_id").eq("user_id", user!.id);
      if (!data?.length) return [];
      const ids = data.map((s: any) => s.research_id);
      const { data: research } = await supabase
        .from("research")
        .select("id, title, description, header_image_url, category, research_type, section, created_at, likes(count), comments(count)")
        .in("id", ids)
        .order("created_at", { ascending: false });
      return (research ?? []).map((r: any) => ({
        ...r,
        like_count: r.likes?.[0]?.count ?? 0,
        comment_count: r.comments?.[0]?.count ?? 0,
      }));
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = q ? savedItems.filter((r: any) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) : savedItems;

  const unsave = async (id: string) => {
    if (!user) return;
    await supabase.from("saved_research").delete().eq("user_id", user.id).eq("research_id", id);
    qc.invalidateQueries({ queryKey: ["saved-research"] });
  };

  return (
    <AppShell title="Saved" search={search} onSearchChange={setSearch} searchPlaceholder="Search saved...">
      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-2xl h-72 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold">No saved research</h2>
            <Link to="/dashboard" className="mt-3 inline-block text-primary hover:underline text-sm">Browse research</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((r: any) => (
              <div key={r.id} className="glass rounded-2xl overflow-hidden hover:glow transition group flex flex-col relative">
                <button onClick={(e) => { e.preventDefault(); unsave(r.id); }} className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur flex items-center justify-center text-primary">
                  <Bookmark className="h-4 w-4 fill-current" />
                </button>
                <Link to="/research/$id" params={{ id: r.id }} className="flex flex-col flex-1">
                  <div className="aspect-video bg-muted/30 relative">
                    {r.header_image_url ? <img src={r.header_image_url} alt={r.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full w-full gradient-bg opacity-30" />}
                    <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-background/70 backdrop-blur px-2 py-1 rounded-full font-semibold">{r.category}</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base line-clamp-2">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{r.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {r.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {r.comment_count}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
