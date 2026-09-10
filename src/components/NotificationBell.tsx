import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { showLocalNotification, ensureNotificationPermission, initPushForCurrentUser } from "@/lib/push-notifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications" as never)
        .select("id, kind, title, body, link, image_url, read_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as unknown as Notif[];
    },
  });

  const unread = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  // Ask permission + register push once when signed in
  useEffect(() => {
    if (!user) return;
    void ensureNotificationPermission();
    void initPushForCurrentUser(user.id);
  }, [user]);

  // Realtime — new notifications land instantly, and fire an OS notification when tab is open
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          qc.setQueryData<Notif[]>(["notifications", user.id], (prev) => [n, ...(prev ?? [])].slice(0, 30));
          if (typeof document !== "undefined" && document.visibilityState !== "visible") {
            showLocalNotification(n.title, { body: n.body ?? "", link: n.link ?? "/" });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications" as never).update({ read_at: new Date().toISOString() } as never).eq("user_id", user.id).is("read_at", null);
    qc.setQueryData<Notif[]>(["notifications", user.id], (prev) => (prev ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const openItem = async (n: Notif) => {
    setOpen(false);
    if (!n.read_at) {
      await supabase.from("notifications" as never).update({ read_at: new Date().toISOString() } as never).eq("id", n.id);
      qc.setQueryData<Notif[]>(["notifications", user!.id], (prev) => (prev ?? []).map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
    }
    if (n.link) navigate({ to: n.link as never }).catch(() => window.location.assign(n.link!));
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted/50 transition" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-80 p-0 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>Mark all read</Button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n)}
                  className={cn("w-full text-left px-3 py-2.5 flex gap-3 hover:bg-muted/40 transition", !n.read_at && "bg-primary/5")}
                >
                  {n.image_url ? (
                    <img src={n.image_url} alt="" className="h-9 w-9 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-md gradient-bg shrink-0 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
