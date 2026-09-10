import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { PasswordInput, isStrongPassword } from "@/components/PasswordInput";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Forgot password — Gizmo Office Plus" },
      { name: "description", content: "Reset your Gizmo Office Plus password using a 6-digit code sent to your email." },
    ],
  }),
});

type Step = "email" | "otp" | "reset";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestOtp = async (isResend = false) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { toast.error("Enter a valid email"); return; }
    if (!captchaToken) { toast.error("Security error: please verify you are not a robot"); captchaRef.current?.reset(); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-request-otp", { body: { email: email.trim(), captchaToken } });
      if (error || (data && data.error)) {
        toast.error((data && data.error) || error?.message || "Could not send code");
        return;
      }
      toast.success(isResend ? "New code sent." : "We sent a 6-digit code to your email.");
      setStep("otp");
      setResendIn(60);
    } finally {
      setSubmitting(false);
      captchaRef.current?.reset();
    }
  };

  const onEmailSubmit = (e: FormEvent) => { e.preventDefault(); requestOtp(false); };

  const onVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit code"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-verify-otp", {
        body: { email: email.trim(), code },
      });
      if (error || (data && data.error)) {
        toast.error((data && data.error) || error?.message || "Verification failed");
        return;
      }
      toast.success("Code verified. Set your new password.");
      setStep("reset");
    } finally {
      setSubmitting(false);
    }
  };

  const onResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(pw)) { toast.error("Password doesn't meet all requirements"); return; }
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-confirm", {
        body: { email: email.trim(), code, password: pw },
      });
      if (error || (data && data.error)) {
        toast.error((data && data.error) || error?.message || "Could not reset password");
        return;
      }
      toast.success("Password updated. Please sign in.");
      navigate({ to: "/", replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = step === "email" ? Mail : step === "otp" ? KeyRound : ShieldCheck;
  const title = step === "email" ? "Forgot password" : step === "otp" ? "Enter verification code" : "Set a new password";
  const subtitle =
    step === "email" ? "Enter your account email and we'll send you a 6-digit code."
    : step === "otp" ? `We sent a 6-digit code to ${email}. Enter it below to continue.`
    : "Choose a strong new password for your account.";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-6"><Logo /></header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md glass-strong rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-center">{title}</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">{subtitle}</p>

          {step === "email" && (
            <form onSubmit={onEmailSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" className="glass" />
              </div>
              <Turnstile ref={captchaRef} onToken={setCaptchaToken} />
              <Button type="submit" disabled={submitting} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send verification code
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={onVerifySubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" className="glass text-center text-2xl tracking-[0.6em] font-mono" />
              </div>
              <Button type="submit" disabled={submitting || code.length !== 6} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify code
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  disabled={submitting || resendIn > 0}
                  onClick={() => requestOtp(true)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                </button>
                <button type="button" onClick={() => setStep("email")} className="text-muted-foreground hover:text-foreground">
                  Change email
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={onResetSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <PasswordInput id="pw" value={pw} onChange={(e) => setPw(e.target.value)} className="glass" showStrength />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirm new password</Label>
                <PasswordInput id="pw2" value={pw2} onChange={(e) => setPw2(e.target.value)} className="glass" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </form>
          )}

          <div className="mt-5 text-center text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">Back to sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
