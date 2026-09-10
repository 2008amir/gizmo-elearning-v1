import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/communities/join/$code")({
  component: JoinByCodePage,
  head: () => ({ meta: [{ title: "Join community — Gizmo Office Plus" }] }),
});

function JoinByCodePage() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "requested" | "joined" | "member" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;
    (async () => {
      const { data: c } = await supabase.from("communities" as never).select("id, name").eq("invite_code", code).maybeSingle();
      const found = c as { id: string; name: string } | null;
      if (!found) { setStatus("error"); setMessage("Invalid or expired invite link."); return; }
      setCommunityName(found.name);
      const { data, error } = await supabase.rpc("join_community_by_code" as never, { _code: code } as never);
      if (error) { setStatus("error"); setMessage(error.message); return; }
      const s = (data as { status?: string } | null)?.status;
      if (s === "joined" || s === "member") {
        setStatus("joined");
        setTimeout(() => navigate({ to: "/communities/$id", params: { id: found.id } }), 800);
      } else if (s === "requested") {
        setStatus("requested");
      } else {
        setStatus("error"); setMessage("Unexpected response");
      }
    })();
  }, [user, code, navigate]);

  return (
    <AppShell title="Join community" standalone onBack={() => navigate({ to: "/communities" })}>
      <div className="max-w-md mx-auto p-6 text-center space-y-4">
        {status === "loading" && (<><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p className="text-sm text-muted-foreground">Processing invite…</p></>)}
        {status === "joined" && (<><div className="text-5xl">🎉</div><h1 className="text-xl font-bold">Welcome to {communityName}!</h1><p className="text-sm text-muted-foreground">Taking you there…</p></>)}
        {status === "requested" && (<><div className="text-5xl">📨</div><h1 className="text-xl font-bold">Request sent</h1><p className="text-sm text-muted-foreground">The owner of <b>{communityName}</b> will review your request.</p><Button onClick={() => navigate({ to: "/communities" })}>Back to communities</Button></>)}
        {status === "error" && (<><div className="text-5xl">❌</div><h1 className="text-xl font-bold">Could not join</h1><p className="text-sm text-muted-foreground">{message}</p><Button onClick={() => navigate({ to: "/communities" })}>Back to communities</Button></>)}
      </div>
    </AppShell>
  );
}
