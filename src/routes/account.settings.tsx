import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme, type ThemePref } from "@/lib/theme";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Gizmo Office Plus" }] }),
});

function SettingsPage() {
  const { user } = useAuth();
  const { pref, setPref } = useTheme();
  const [prefs, setPrefs] = useState({ email_updates: true, course_reminders: true, assignment_alerts: true, community_mentions: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_prefs" as never).select("*").eq("user_id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) setPrefs({ email_updates: data.email_updates, course_reminders: data.course_reminders, assignment_alerts: data.assignment_alerts, community_mentions: data.community_mentions });
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("notification_prefs" as never).upsert({ user_id: user.id, ...prefs } as never);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const rows: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "email_updates", label: "Email updates", desc: "Product news and announcements" },
    { key: "course_reminders", label: "Course reminders", desc: "Nudges to continue learning" },
    { key: "assignment_alerts", label: "Assignment alerts", desc: "Due dates and grade updates" },
    { key: "community_mentions", label: "Community mentions", desc: "When someone mentions you in chat" },
  ];

  const themeOptions: { key: ThemePref; label: string; icon: any; desc: string }[] = [
    { key: "system", label: "System", icon: Monitor, desc: "Match your device" },
    { key: "light", label: "Light", icon: Sun, desc: "Always light" },
    { key: "dark", label: "Dark", icon: Moon, desc: "Always dark" },
  ];

  return (
    <AppShell title="Settings">
      <div className="p-4 md:p-6 max-w-2xl space-y-8">
        <section>
          <h2 className="font-bold text-lg mb-4">Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ key, label, icon: I, desc }) => (
              <button
                key={key}
                onClick={() => setPref(key)}
                className={cn(
                  "glass rounded-2xl p-4 text-left transition border",
                  pref === key ? "ring-2 ring-primary border-transparent" : "border-border/50 hover:border-border",
                )}
              >
                <I className="h-5 w-5 mb-2 text-primary" />
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-lg mb-4">Notifications</h2>
          {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
            <div className="glass rounded-2xl divide-y divide-border/50">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                  <Switch checked={prefs[r.key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [r.key]: v }))} />
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} className="mt-4 gradient-bg text-primary-foreground">Save changes</Button>
        </section>
      </div>
    </AppShell>
  );
}

