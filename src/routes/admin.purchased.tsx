import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/purchased")({ component: AdminPurchased });

type Row = {
  id: string;
  reviewed_at: string | null;
  created_at: string;
  course_title: string;
  course_price: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
};

function AdminPurchased() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-purchases", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_purchases", { _status: "approved" });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold gradient-text">Purchased</h1>
      {isLoading ? (
        <div className="glass rounded-xl h-40 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center text-sm text-muted-foreground">No approved purchases yet.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="glass-strong rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {r.first_name} {r.last_name} <span className="text-muted-foreground font-normal">· @{r.username}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                <div className="text-xs mt-1">
                  <span className="text-primary font-medium">{r.course_title}</span>
                  <span className="text-muted-foreground"> · ₦{Number(r.course_price).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground text-right">
                {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
