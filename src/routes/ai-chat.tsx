import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LIMIT = 5;
const STORAGE_KEY = "ai-chat-count";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/ai-chat")({
  component: AiChatPage,
  head: () => ({ meta: [{ title: "AI Assistant — Gizmo Office Plus" }] }),
});

function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your Gizmo AI assistant. You've got 5 messages in this session — ask me anything." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = typeof window !== "undefined" ? Number(localStorage.getItem(STORAGE_KEY) ?? "0") : 0;
    setUsed(Number.isFinite(v) ? v : 0);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const remaining = Math.max(0, LIMIT - used);
  const disabled = busy || remaining <= 0;

  const send = async () => {
    const text = input.trim();
    if (!text || disabled) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: { messages: next.map(({ role, content }) => ({ role, content })) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = String((data as any)?.reply ?? "").trim() || "…";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      const newUsed = used + 1;
      setUsed(newUsed);
      localStorage.setItem(STORAGE_KEY, String(newUsed));
    } catch (e: any) {
      toast.error(e?.message || "AI failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="AI Assistant">
      <div className="p-4 md:p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Bot className="h-4 w-4" /> Session</div>
          <span className="text-xs text-muted-foreground">{remaining}/{LIMIT} messages left</span>
        </div>

        <div className="glass-strong rounded-2xl p-4 space-y-3 min-h-[50vh]">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-primary-foreground" /></div>
              )}
              <div className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4" /></div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center"><Bot className="h-4 w-4 text-primary-foreground" /></div>
              <div className="rounded-2xl px-3 py-2 text-sm bg-muted/40 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {remaining <= 0 ? (
          <div className="mt-4 glass rounded-xl p-4 text-sm text-center text-muted-foreground">
            You've reached the 5-message limit for this session. Come back later for more chats.
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 h-11 px-3 rounded-md glass bg-background/40 border border-border text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ask anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={disabled}
            />
            <Button onClick={send} disabled={disabled || !input.trim()} className="gradient-bg text-primary-foreground h-11">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
