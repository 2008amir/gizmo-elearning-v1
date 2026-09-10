import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const searchSchema = z.object({ email: z.string().email().optional().catch(undefined) });

export const Route = createFileRoute("/verify-email")({
  validateSearch: searchSchema,
  component: VerifyEmailPage,
  head: () => ({
    meta: [
      { title: "Verify your email — Gizmo Office Plus" },
      { name: "description", content: "Enter the 6-digit code we emailed you to finish creating your account." },
    ],
  }),
});

function VerifyEmailPage() {
  const { email } = useSearch({ from: "/verify-email" });
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Missing email. Please sign up again."); return; }
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-verify-otp", {
        body: { email, code },
      });
      if (error || !data || data.error) {
        toast.error((data && data.error) || error?.message || "Verification failed");
        setSubmitting(false);
        return;
      }
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        toast.success("Account verified! Welcome aboard 🎉");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Please sign in.");
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email) { toast.error("Missing email. Please sign up again."); return; }
    if (!captchaToken) { toast.error("Please complete the verification check below."); return; }
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-request-otp", {
        body: { email, resend: true, captchaToken },
      });
      if (error || !data || data.error) {
        toast.error((data && data.error) || error?.message || "Could not send a new code");
        return;
      }
      setCode("");
      toast.success("We sent a new code to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send a new code");
    } finally {
      captchaRef.current?.reset();
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md glass-strong rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-center">Verify your email</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email || "your email"}</span>. Enter it below to finish creating your account.
          </p>
          <form onSubmit={onSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="glass text-center text-2xl tracking-[0.6em] font-mono"
              />
            </div>
            <Button type="submit" disabled={submitting || code.length !== 6} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & create account
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between text-sm">
            <button type="button" onClick={resend} disabled={resending} className="text-muted-foreground hover:text-foreground">
              Didn't get the code?
            </button>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Back to sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
