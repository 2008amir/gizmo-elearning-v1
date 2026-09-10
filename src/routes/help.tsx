import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/help")({
  component: Help,
  head: () => ({ meta: [{ title: "Help — Gizmo Office Plus" }] }),
});

const FAQ = [
  { q: "How do I enroll in a course?", a: "Open a course from All Courses. If it's premium, complete the payment flow — otherwise it unlocks immediately." },
  { q: "How do I get a certificate?", a: "Certificates are automatically issued when you reach 100% on all lessons in a course." },
  { q: "Can I change my password?", a: "Yes — go to Account → Security to update your password or sign out of all devices." },
  { q: "How do I contact support?", a: "Use the contact form below to open a support ticket. We respond within 24 hours." },
];

function Help() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`tix-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["my-tickets"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data: tickets = [] } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("support_tickets" as never).select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data as any[] ?? [],
  });

  const submit = async () => {
    if (!user || !subject.trim() || !msg.trim()) return toast.error("Please fill in all fields");
    const { error } = await supabase.from("support_tickets" as never).insert({ user_id: user.id, subject, message: msg } as never);
    if (error) return toast.error(error.message);
    toast.success("Ticket submitted");
    setSubject(""); setMsg("");
  };

  return (
    <AppShell title="Help & Support">
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        <section>
          <h2 className="font-bold text-lg mb-3">Frequently asked</h2>
          <Accordion type="single" collapsible className="glass rounded-2xl px-4">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`i${i}`}>
                <AccordionTrigger className="text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-bold text-lg">Contact support</h2>
          <div className="mt-3 space-y-3">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="How can we help?" value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-32" />
            <Button onClick={submit} className="gradient-bg text-primary-foreground">Send ticket</Button>
          </div>
        </section>

        {tickets.length > 0 && (
          <section>
            <h2 className="font-bold text-lg mb-3">Your tickets</h2>
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm">{t.subject}</div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${t.status === "resolved" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.message}</p>
                  {t.admin_reply && <div className="mt-2 rounded-lg bg-primary/10 p-2 text-xs"><b>Reply:</b> {t.admin_reply}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{format(new Date(t.created_at), "PPp")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
