import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, isSameDay, startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — Gizmo Office Plus" }] }),
});

type Event = { id: string; user_id: string | null; title: string; description: string | null; event_type: string; starts_at: string; ends_at: string | null };

function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`calendar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => qc.invalidateQueries({ queryKey: ["events"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => (await supabase.from("calendar_events" as never).select("*").order("starts_at", { ascending: true })).data as unknown as Event[] ?? [],
  });

  const add = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("calendar_events" as never).insert({ user_id: user.id, title, description: desc, event_type: "personal", starts_at: new Date(date).toISOString() } as never);
    if (error) { toast.error(error.message); return; }
    setOpen(false); setTitle(""); setDesc("");
    toast.success("Event added");
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("calendar_events" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  // Build month grid
  const gridStart = startOfWeek(month);
  const gridEnd = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  return (
    <AppShell title="Calendar">
      <div className="p-4 md:p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonth(addDays(startOfMonth(month), -1))}>‹</Button>
            <div className="font-semibold">{format(month, "MMMM yyyy")}</div>
            <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(addDays(endOfMonth(month), 1)))}>›</Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gradient-bg text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add event</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                <Button onClick={add} className="w-full gradient-bg text-primary-foreground">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="p-2 text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const evs = events.filter((e) => isSameDay(new Date(e.starts_at), d));
              const inMonth = d.getMonth() === month.getMonth();
              const today = isSameDay(d, new Date());
              return (
                <div key={d.toISOString()} className={cn("min-h-20 p-1.5 border-b border-r border-border/40 text-xs", !inMonth && "opacity-30")}>
                  <div className={cn("h-6 w-6 flex items-center justify-center rounded-full", today && "bg-primary text-primary-foreground font-bold")}>{d.getDate()}</div>
                  <div className="space-y-0.5 mt-1">
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} className="truncate rounded bg-primary/15 text-primary px-1 py-0.5 text-[10px]" title={e.title}>{e.title}</div>
                    ))}
                    {evs.length > 2 && <div className="text-[10px] text-muted-foreground">+{evs.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <h2 className="mt-6 mb-3 font-semibold">Upcoming</h2>
        <div className="space-y-2">
          {events.filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 10).map((e) => (
            <div key={e.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">{format(new Date(e.starts_at), "PPp")}</div>
              </div>
              {e.user_id === user?.id && (
                <button onClick={() => del(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
