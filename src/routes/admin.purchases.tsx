import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";


export const Route = createFileRoute("/admin/purchases")({ component: AdminPurchases });

type Row = {
  id: string;
  status: string;
  receipt_url: string;
  bank_name: string;
  account_name: string;
  created_at: string;
  user_id: string;
  course_id: string;
  course_title: string;
  course_price: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
};

function AdminPurchases() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-purchases", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_purchases", { _status: "pending" });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-course-purchases")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_purchases" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-purchases"] });
          qc.invalidateQueries({ queryKey: ["admin-purchase-stats"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);


  const act = async (id: string, action: "approved" | "rejected" | "scam") => {
    setBusy(id + action);
    const { error } = await supabase.rpc("admin_review_purchase", { _purchase_id: id, _action: action });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const msg = action === "approved" ? "Marked as received — course unlocked" : action === "rejected" ? "Marked as not received" : "Marked as scam — user blocked";
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin-purchases"] });
    qc.invalidateQueries({ queryKey: ["admin-purchase-stats"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold gradient-text">Purchase reviews</h1>
      {isLoading ? (
        <div className="glass rounded-xl h-40 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center text-sm text-muted-foreground">No pending purchases.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const expanded = open === r.id;
            return (
              <li key={r.id} className="glass-strong rounded-2xl overflow-hidden">
                <button onClick={() => setOpen(expanded ? null : r.id)} className="w-full text-left p-4 flex items-center gap-3">
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
                  <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </button>
                {expanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bank</div>
                        <div className="font-medium">{r.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account name</div>
                        <div className="font-medium">{r.account_name}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</div>
                        <div className="font-medium">{new Date(r.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <a href={r.receipt_url} target="_blank" rel="noreferrer" className="block">
                      <img src={r.receipt_url} alt="receipt" className="max-h-72 mx-auto rounded-md object-contain glass" />
                    </a>
                    <div className="grid grid-cols-3 gap-2">
                      <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => act(r.id, "approved")} disabled={!!busy}>
                        {busy === r.id + "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Received</>}
                      </Button>
                      <Button className="bg-amber-500 hover:bg-amber-400 text-black" onClick={() => act(r.id, "rejected")} disabled={!!busy}>
                        {busy === r.id + "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" /> Not received</>}
                      </Button>
                      <Button className="bg-red-600 hover:bg-red-500 text-white" onClick={() => act(r.id, "scam")} disabled={!!busy}>
                        {busy === r.id + "scam" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldAlert className="h-4 w-4 mr-1" /> Scam</>}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
