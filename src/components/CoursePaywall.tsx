import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Lock, Upload, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getStorageUrl } from "@/lib/storage-url";
import { uploadWithSupabaseRetry } from "@/lib/supabase-retry";
import { toast } from "sonner";

export type Purchase = {
  id: string;
  course_id: string;
  status: "pending" | "approved" | "rejected" | "scam";
  receipt_url: string;
  bank_name: string;
  account_name: string;
};

export type PaywallCourse = { id: string; title: string; price: number };

const BANK = { bank: "Opay", acc_no: "9128600130", acc_name: "Abdulsalam Nasiru Barda" };

type Stage = "intro" | "details" | "form" | "pending";

export function CoursePaywall({
  course,
  purchase,
  onClose,
}: {
  course: PaywallCourse;
  purchase: Purchase | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const initialStage: Stage = purchase?.status === "pending" ? "pending" : "intro";
  const [stage, setStage] = useState<Stage>(initialStage);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptPath, setReceiptPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);

  const copyAcc = async () => {
    try { await navigator.clipboard.writeText(BANK.acc_no); toast.success("Account number copied"); }
    catch { toast.error("Could not copy"); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${course.id}-${Date.now()}.${ext}`;
    const { error } = await uploadWithSupabaseRetry("purchase-receipts", path, file, { contentType: file.type }, 6);
    if (error) { toast.error(error.message); setUploading(false); return; }
    try {
      const url = await getStorageUrl("purchase-receipts", path);
      setReceiptUrl(url);
      setReceiptPath(path);
      toast.success("Receipt uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Failed to sign URL"); }
    setUploading(false);
  };

  const submit = async () => {
    if (!user) return;
    if (!receiptUrl) { toast.error("Upload a receipt image"); return; }
    if (!bankName.trim() || !accountName.trim()) { toast.error("Bank name and account name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("course_purchases" as never).insert({
      user_id: user.id,
      course_id: course.id,
      receipt_url: receiptUrl,
      bank_name: bankName.trim(),
      account_name: accountName.trim(),
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Submitted for review");
    qc.invalidateQueries({ queryKey: ["my-purchases"] });
    setStage("pending");
  };

  const makeAnother = async () => {
    if (!purchase) return;
    // Remove the pending one and start over
    const { error } = await supabase.from("course_purchases" as never).delete().eq("id", purchase.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-purchases"] });
    setReceiptUrl(""); setReceiptPath(""); setBankName(""); setAccountName("");
    setStage("details");
  };

  const requestReview = () => {
    toast.success("Review request sent. An admin will look at your payment shortly.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="glass-strong rounded-2xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-muted/50" aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        {stage === "intro" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{course.title} is Premium</h2>
              <p className="text-sm text-muted-foreground mt-1">This course requires a one-time purchase to unlock.</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-3xl font-bold gradient-text">₦{Number(course.price).toLocaleString()}</div>
            </div>
            <Button className="w-full gradient-bg text-primary-foreground" onClick={() => setStage("details")}>
              Proceed to payment
            </Button>
          </div>
        )}

        {stage === "details" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Bank transfer details</h2>
            <p className="text-xs text-muted-foreground">
              Transfer <span className="font-semibold text-foreground">₦{Number(course.price).toLocaleString()}</span> to the account below.
            </p>
            <div className="glass rounded-xl p-4 space-y-3">
              <Row label="Bank name" value={BANK.bank} />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Account number</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="font-mono text-lg font-semibold flex-1">{BANK.acc_no}</div>
                  <button onClick={copyAcc} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md glass hover:bg-muted/60">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              </div>
              <Row label="Account name" value={BANK.acc_name} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel payment</Button>
              <Button className="flex-1 gradient-bg text-primary-foreground" onClick={() => setStage("form")}>
                I have made the payment
              </Button>
            </div>
          </div>
        )}

        {stage === "form" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Submit payment for review</h2>
            <div className="space-y-1.5">
              <Label>Upload receipt (image)</Label>
              <label className="glass rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/40 min-h-24">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground">
                  {receiptUrl ? "Change file" : "Tap to upload receipt"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
              </label>
              {receiptUrl && <img src={receiptUrl} alt="receipt" className="mt-1 max-h-40 rounded-md object-contain mx-auto" />}
              {receiptPath && <div className="text-[10px] text-muted-foreground truncate">{receiptPath}</div>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-bank">Your bank name</Label>
              <Input id="pf-bank" className="glass" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank you paid from" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-acc">Your account name</Label>
              <Input id="pf-acc" className="glass" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Name on the sending account" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStage("details")}>Back</Button>
              <Button className="flex-1 gradient-bg text-primary-foreground" onClick={submit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Review
              </Button>
            </div>
          </div>
        )}

        {stage === "pending" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Your payment is under review</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We are verifying your transfer. You'll get access to {course.title} once approved.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full gradient-bg text-primary-foreground" onClick={requestReview}>Request review</Button>
              <Button variant="outline" className="w-full" onClick={makeAnother}>Make another transaction</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
