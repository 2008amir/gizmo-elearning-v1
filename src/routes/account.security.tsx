import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/account/security")({
  component: SecurityPage,
  head: () => ({ meta: [{ title: "Security — Gizmo Office Plus" }] }),
});

function SecurityPage() {
  const { user, signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw(""); setPw2("");
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Signed out from all devices");
  };

  return (
    <AppShell title="Security">
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <section className="glass rounded-2xl p-5">
          <h2 className="font-bold">Change password</h2>
          <div className="mt-4 space-y-3">
            <div>
              <Label>New password</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button onClick={changePassword} disabled={saving} className="gradient-bg text-primary-foreground">Update password</Button>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-bold">Active sessions</h2>
          <p className="text-sm text-muted-foreground mt-1">Signed in as {user?.email}. Sign out from every device if you notice suspicious activity.</p>
          <Button variant="outline" onClick={signOutAll} className="mt-4">Sign out of all sessions</Button>
        </section>

        <section className="glass rounded-2xl p-5 border border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-bold">Danger zone</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Contact support to delete your account permanently.</p>
          <Button variant="destructive" onClick={signOut} className="mt-4">Sign out</Button>
        </section>
      </div>
    </AppShell>
  );
}
