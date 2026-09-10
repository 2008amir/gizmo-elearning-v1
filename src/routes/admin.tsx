import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth requireAdmin><AdminLayout /></RequireAuth>,
  head: () => ({ meta: [{ title: "Admin — Gizmo Office Plus" }] }),
});

const TABS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/chat", label: "Chat" },
  { to: "/admin/courses", label: "Courses" },
  { to: "/admin/assignments", label: "Assignments" },
  { to: "/admin/exams", label: "Exams" },
  { to: "/admin/certificates", label: "Certificates" },
  { to: "/admin/purchases", label: "Purchase review" },
  { to: "/admin/purchased", label: "Purchased" },
  { to: "/admin/posts", label: "Posts" },
  { to: "/admin/research", label: "Research", exact: true },
  { to: "/admin/research/new", label: "Add Research" },
  { to: "/admin/research/templates", label: "Templates" },
  { to: "/admin/diagnostics", label: "Diagnostics" },
];

function AdminLayout() {
  const [search, setSearch] = useState("");
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <TopBar search={search} onSearchChange={setSearch} homeTo="/admin" profileTo="/profile" />
      <div className="border-b border-border bg-background/40">
        <div className="container mx-auto px-4 h-12 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to as never}
                className={cn(
                  "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition border",
                  active ? "gradient-bg text-primary-foreground border-transparent glow" : "border-border text-muted-foreground hover:bg-muted/50"
                )}>
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <main className="container mx-auto px-4 py-6">
        {location.pathname === "/admin" ? <Overview /> : <Outlet />}
      </main>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withSupabaseRetry } from "@/lib/supabase-retry";
import { Users, FileText, Heart, MessageCircle, Wallet, CheckCircle2, Award, BookOpen } from "lucide-react";

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await withSupabaseRetry(
        () => supabase.rpc("get_admin_stats"),
        4,
        { kind: "rpc", target: "get_admin_stats", action: "admin overview stats" },
      );
      if (error) throw error;
      const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const last7Raw = ((data as any)?.last7 ?? []) as Array<{ day: string; count: number }>;
      const byDow = new Map<number, number>();
      for (const r of last7Raw) {
        const dow = new Date(r.day).getDay();
        byDow.set(dow, (byDow.get(dow) ?? 0) + (r.count ?? 0));
      }
      // Build the last 7 days ending today, so today is the last candle.
      const today = new Date();
      const todayDow = today.getDay();
      const last7: { label: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dow = (todayDow - i + 7) % 7;
        last7.push({ label: labels[dow], count: byDow.get(dow) ?? 0 });
      }
      return {
        users: (data as any)?.users ?? 0,
        research: (data as any)?.research ?? 0,
        likes: (data as any)?.likes ?? 0,
        comments: (data as any)?.comments ?? 0,
        last7,
        dailyActive: (data as any)?.dailyActive ?? 0,
        weeklyActive: (data as any)?.weeklyActive ?? 0,
        monthlyActive: (data as any)?.monthlyActive ?? 0,
      };
    },
  });

  const { data: purchaseStats } = useQuery({
    queryKey: ["admin-purchase-stats"],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [{ count: pending }, { count: approved }, { count: certs }, { count: coursesCount }] = await Promise.all([
        supabase.from("course_purchases" as never).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("course_purchases" as never).select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("certificates" as never).select("id", { count: "exact", head: true }),
        supabase.from("courses" as never).select("id", { count: "exact", head: true }),
      ]);
      return { pending: pending ?? 0, approved: approved ?? 0, certificates: certs ?? 0, courses: coursesCount ?? 0 };
    },
  });

  const last7 = data?.last7 ?? [];
  const max = Math.max(1, ...last7.map((d) => d.count));

  const cards: Array<{ label: string; value: number; I: any; to?: string; period?: "daily" | "weekly" | "monthly" }> = [
    { label: "Daily Active", value: data?.dailyActive ?? 0, I: Users, period: "daily" },
    { label: "Weekly Active", value: data?.weeklyActive ?? 0, I: Users, period: "weekly" },
    { label: "Monthly Active", value: data?.monthlyActive ?? 0, I: Users, period: "monthly" },
    { label: "Total Courses", value: purchaseStats?.courses ?? 0, I: BookOpen, to: "/admin/courses" },
    { label: "Total Certificates", value: purchaseStats?.certificates ?? 0, I: Award, to: "/admin/certificates" },
    { label: "Purchase Review", value: purchaseStats?.pending ?? 0, I: Wallet, to: "/admin/purchases" },
    { label: "Purchased", value: purchaseStats?.approved ?? 0, I: CheckCircle2, to: "/admin/purchased" },
    { label: "Total Likes", value: data?.likes ?? 0, I: Heart, to: "/admin/likes" },
    { label: "Total Comments", value: data?.comments ?? 0, I: MessageCircle, to: "/admin/comments" },
    { label: "Total Users", value: data?.users ?? 0, I: FileText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold gradient-text">Overview</h1>
      <div className="glass-strong rounded-2xl p-5">
        <div className="text-sm font-semibold mb-4">Daily active users (last 7 days)</div>
        <div className="flex items-end gap-3 h-48">
          {last7.map((d, i) => {
            const h = max > 0 ? Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0) : 0;
            const isMax = d.count === max && max > 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className={cn("text-xs", isMax ? "text-primary font-semibold" : "text-muted-foreground")}>{d.count}</div>
                <div className="w-full bg-muted/30 rounded-md overflow-hidden flex-1 flex items-end">
                  <div className="w-full gradient-bg rounded-md transition-all duration-500" style={{ height: `${h}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, I, period, to }) => {
          const content = (
            <>
              <I className="h-6 w-6 text-primary mb-3" />
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </>
          );
          if (period) {
            return (
              <Link key={label} to="/admin/active/$period" params={{ period }} className="glass-strong rounded-2xl p-5 hover:ring-1 hover:ring-primary transition block">
                {content}
              </Link>
            );
          }
          if (to) {
            return (
              <Link key={label} to={to as never} className="glass-strong rounded-2xl p-5 hover:ring-1 hover:ring-primary transition block">
                {content}
              </Link>
            );
          }
          return <div key={label} className="glass-strong rounded-2xl p-5">{content}</div>;
        })}
      </div>
    </div>
  );
}

