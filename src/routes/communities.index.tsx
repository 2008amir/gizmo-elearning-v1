import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Users, Crown, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/communities/")({
  component: CommunitiesPage,
  head: () => ({ meta: [{ title: "Communities — Gizmo Office Plus" }] }),
});

type Community = {
  id: string; owner_id: string; name: string; description: string | null;
  image_url: string | null; invite_code: string; allow_open_join: boolean;
  member_count: number; created_at: string;
};

function CommunitiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "discover">("my");
  const [q, setQ] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`communities-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, () => qc.invalidateQueries({ queryKey: ["communities"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "community_members", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["my-communities"] });
        qc.invalidateQueries({ queryKey: ["my-join-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "community_join_requests", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-join-requests"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: myMemberships = [] } = useQuery({
    queryKey: ["my-communities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("community_members" as never)
        .select("community_id, role, joined_at, communities(*)").eq("user_id", user!.id);
      return (data as unknown as { community_id: string; role: string; communities: Community }[] | null) ?? [];
    },
  });

  const { data: allCommunities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => (await supabase.from("communities" as never).select("*").order("created_at", { ascending: false })).data as unknown as Community[] ?? [],
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["my-join-requests", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("community_join_requests" as never)
      .select("community_id, status").eq("user_id", user!.id)).data as unknown as { community_id: string; status: string }[] ?? [],
  });

  const memberIds = useMemo(() => new Set(myMemberships.map((m) => m.community_id)), [myMemberships]);
  const requestStatus = useMemo(() => new Map(myRequests.map((r) => [r.community_id, r.status])), [myRequests]);

  const filteredDiscover = allCommunities.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return c.name.toLowerCase().includes(s) || (c.description ?? "").toLowerCase().includes(s);
  });

  const handleJoin = async (c: Community) => {
    if (!user) return;
    setJoining(c.id);
    const { data, error } = await supabase.rpc("request_or_join_community" as never, { _community_id: c.id } as never);
    setJoining(null);
    if (error) { toast.error(error.message); return; }
    const status = (data as { status?: string } | null)?.status;
    if (status === "joined") { toast.success(`Joined ${c.name}`); navigate({ to: "/communities/$id", params: { id: c.id } }); }
    else if (status === "requested") toast.success("Request sent — waiting for owner approval");
    else if (status === "member") navigate({ to: "/communities/$id", params: { id: c.id } });
  };

  return (
    <AppShell title="Communities">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex gap-2">
            {(["my", "discover"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-2 rounded-full text-sm font-medium capitalize transition",
                  tab === t ? "bg-primary text-primary-foreground" : "glass hover:bg-muted")}>
                {t === "my" ? "My communities" : "Discover"}
              </button>
            ))}
          </div>
          <Link to="/communities/new" className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Create
          </Link>
        </div>

        {tab === "discover" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all communities…" className="pl-9" />
          </div>
        )}

        {tab === "my" ? (
          myMemberships.length === 0 ? (
            <EmptyState onCreate={() => navigate({ to: "/communities/new" })} onDiscover={() => setTab("discover")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myMemberships.map((m) => (
                <Link key={m.community_id} to="/communities/$id" params={{ id: m.community_id }} className="glass rounded-2xl p-4 hover:glow transition flex items-start gap-3">
                  <Avatar url={m.communities?.image_url} name={m.communities?.name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate flex items-center gap-1.5">
                      {m.communities?.name}
                      {m.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.communities?.description || "—"}</p>
                    <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><Users className="h-3 w-3" /> {m.communities?.member_count} members</div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          filteredDiscover.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No communities found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDiscover.map((c) => {
                const isMember = memberIds.has(c.id);
                const req = requestStatus.get(c.id);
                return (
                  <div key={c.id} className="glass rounded-2xl p-4 flex items-start gap-3">
                    <Avatar url={c.image_url} name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.name}</div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description || "—"}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.member_count}</span>
                        {isMember ? (
                          <Link to="/communities/$id" params={{ id: c.id }} className="text-xs text-primary font-medium inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Open</Link>
                        ) : req === "pending" ? (
                          <span className="text-xs text-amber-500">Pending approval</span>
                        ) : (
                          <Button size="sm" onClick={() => handleJoin(c)} disabled={joining === c.id} className="h-8">
                            {joining === c.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {c.allow_open_join ? "Join" : "Request to join"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

function Avatar({ url, name }: { url: string | null | undefined; name: string }) {
  if (url) return <img src={url} alt={name} className="h-12 w-12 rounded-xl object-cover shrink-0" />;
  return <div className="h-12 w-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-bold shrink-0">{name[0]?.toUpperCase() ?? "?"}</div>;
}

function EmptyState({ onCreate, onDiscover }: { onCreate: () => void; onDiscover: () => void }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <UsersRoundIcon />
      <div className="text-lg font-semibold mt-2">You're not in any communities yet</div>
      <p className="text-sm text-muted-foreground mt-1">Create your own or discover ones to join.</p>
      <div className="mt-4 flex gap-2 justify-center">
        <Button onClick={onCreate} className="gradient-bg text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Create</Button>
        <Button variant="outline" onClick={onDiscover}>Discover</Button>
      </div>
    </div>
  );
}

function UsersRoundIcon() {
  return <div className="h-14 w-14 rounded-2xl gradient-bg inline-flex items-center justify-center"><Users className="h-6 w-6 text-primary-foreground" /></div>;
}
