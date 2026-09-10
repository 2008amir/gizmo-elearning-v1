import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/organisation/management")({
  component: () => <RequireAuth requireAdmin><Management /></RequireAuth>,
  head: () => ({ meta: [{ title: "Organisation Management — Gizmo Office Plus" }] }),
});

function Management() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("organisation_settings" as never).select("*").eq("id", 1).maybeSingle().then(({ data }: any) => {
      setOrg(data ?? { id: 1, org_name: "Gizmo Office Plus", tagline: "//CODEBREAKERS", primary_color: "#3b82f6" });
      setLoading(false);
    });
  }, []);

  const save = async () => {
    const { error } = await supabase.from("organisation_settings" as never).upsert(org as never);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  if (loading) return <AppShell title="Management"><div className="p-6 text-sm text-muted-foreground">Loading...</div></AppShell>;

  return (
    <AppShell title="Organisation Management">
      <div className="p-4 md:p-6 max-w-2xl">
        <h2 className="font-bold text-lg mb-4">Branding & policies</h2>
        <div className="glass rounded-2xl p-5 space-y-3">
          <div><Label>Organisation name</Label><Input value={org.org_name ?? ""} onChange={(e) => setOrg({ ...org, org_name: e.target.value })} /></div>
          <div><Label>Tagline</Label><Input value={org.tagline ?? ""} onChange={(e) => setOrg({ ...org, tagline: e.target.value })} /></div>
          <div><Label>Logo URL</Label><Input value={org.logo_url ?? ""} onChange={(e) => setOrg({ ...org, logo_url: e.target.value })} /></div>
          <div><Label>Primary color</Label><Input type="color" value={org.primary_color ?? "#3b82f6"} onChange={(e) => setOrg({ ...org, primary_color: e.target.value })} className="h-10 w-24" /></div>
          <div><Label>Support email</Label><Input type="email" value={org.support_email ?? ""} onChange={(e) => setOrg({ ...org, support_email: e.target.value })} /></div>
          <Button onClick={save} className="gradient-bg text-primary-foreground">Save changes</Button>
        </div>
      </div>
    </AppShell>
  );
}
