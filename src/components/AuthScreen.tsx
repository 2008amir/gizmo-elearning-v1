import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/Logo";
import { CountrySelect } from "@/components/CountrySelect";
import { PasswordInput } from "@/components/PasswordInput";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const signInSchema = z.object({
  identifier: z.string().min(1, "Required").max(255),
  password: z.string().min(1, "Required"),
});

const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  username: z.string().trim().min(3, "Min 3 chars").max(30).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, _ only"),
  email: z.string().trim().email("Invalid email").max(255),
  country: z.string().min(1, "Select a country"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export function AuthScreen() {
  const { user, isAdmin, rolesLoaded, rolesError, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("signin");
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    // Wait for auth + roles to fully load before redirecting,
    // otherwise admins can briefly look like regular users and get sent to /dashboard.
    if (loading || !user || !rolesLoaded || rolesError) return;
    navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
  }, [user, isAdmin, rolesLoaded, rolesError, loading, navigate]);

  if (authPending || (user && (loading || !rolesLoaded))) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-6 max-w-sm text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <h1 className="mt-4 text-lg font-semibold">Loading Dashboard........</h1>
        </div>
      </div>
    );
  }

  if (user && rolesError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold">Account check failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">{rolesError}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={refreshProfile} className="gradient-bg text-primary-foreground hover:opacity-90">Retry</Button>
            <Button onClick={signOut} variant="outline">Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container mx-auto px-4 py-6">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md glass-strong rounded-2xl p-6 md:p-8">
          <div className="w-full">
            <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  authMode === "signin" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  authMode === "signup" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>
            <div className="mt-6">
              <div style={{ display: authMode === "signin" ? "block" : "none" }}>
                <SignInForm onPendingChange={setAuthPending} />
              </div>
              <div style={{ display: authMode === "signup" ? "block" : "none" }}>
                <SignUpForm onPendingChange={setAuthPending} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SignInForm({ onPendingChange }: { onPendingChange: (v: boolean) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signInSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ identifier: flat.identifier?.[0] ?? "", password: flat.password?.[0] ?? "" });
      return;
    }
    if (!captchaToken) {
      toast.error("Security error: please verify you are not a robot");
      captchaRef.current?.reset();
      return;
    }
    setSubmitting(true);
    try {
      let signInError: { message: string } | null = null;
      if (identifier.trim().includes("@")) {
        // Verify captcha server-side before password sign-in.
        const { data: capData, error: capErr } = await supabase.functions.invoke("verify-captcha", {
          body: { token: captchaToken },
        });
        if (capErr || !capData?.ok) {
          signInError = { message: "Captcha verification failed" };
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
          signInError = error;
        }
      } else {
        // Username sign-in is resolved server-side so the email is never exposed to the client.
        const { data, error: fnErr } = await supabase.functions.invoke("login-with-username", {
          body: { username: identifier.trim(), password, captchaToken },
        });
        if (fnErr || !data?.access_token || !data?.refresh_token) {
          signInError = { message: "Invalid username or password" };
        } else {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          signInError = setErr;
        }
      }
      if (signInError) {
        toast.error(signInError.message);
        setSubmitting(false);
        return;
      }
      toast.success("Welcome back!");
      onPendingChange(true);
      // Keep submitting=true; redirect happens once auth + roles load.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      setSubmitting(false);
    } finally {
      captchaRef.current?.reset();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or Username</Label>
        <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@example.com" autoComplete="username" className="glass" />
        {errors.identifier && <p className="text-xs text-destructive">{errors.identifier}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" className="glass" />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>
      <Turnstile ref={captchaRef} onToken={setCaptchaToken} />
      <Button type="submit" disabled={submitting} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <div className="text-center">
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

function SignUpForm({ onPendingChange: _onPendingChange }: { onPendingChange: (v: boolean) => void }) {

  const [form, setForm] = useState({
    firstName: "", lastName: "", username: "", email: "", country: "", password: "", confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle | null>(null);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  // Debounced username availability check
  useEffect(() => {
    const u = form.username.trim();
    if (!u) { setUsernameStatus("idle"); return; }
    if (u.length < 3 || !/^[a-zA-Z0-9_]+$/.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", { _username: u });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data ? "available" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [form.username]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const e: Record<string, string> = {};
      for (const k in flat) e[k] = flat[k as keyof typeof flat]?.[0] ?? "";
      setErrors(e);
      return;
    }
    if (usernameStatus === "taken") {
      setErrors({ username: "Username already taken" });
      return;
    }
    if (!captchaToken) {
      toast.error("Security error: please verify you are not a robot");
      captchaRef.current?.reset();
      return;
    }
    setSubmitting(true);
    try {
      const { data: available, error: checkErr } = await supabase
        .rpc("is_username_available", { _username: form.username });
      if (checkErr) {
        toast.error("Could not validate username. Try again.");
        setSubmitting(false);
        return;
      }
      if (!available) {
        setErrors({ username: "Username already taken" });
        setUsernameStatus("taken");
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("signup-request-otp", {
        body: {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          country: form.country,
          captchaToken,
        },
      });
      if (error || !data || data.error) {
        toast.error((data && data.error) || error?.message || "Could not create your account");
        setSubmitting(false);
        return;
      }
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        toast.success("Account created! Welcome aboard 🎉");
        _onPendingChange(true);
      } else {
        toast.success("Account created. Please sign in.");
        setSubmitting(false);
      }

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
      setSubmitting(false);
    } finally {
      captchaRef.current?.reset();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={form.firstName} onChange={set("firstName")} className="glass" />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={form.lastName} onChange={set("lastName")} className="glass" />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={form.username} onChange={set("username")} className="glass" autoComplete="username" />
        {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
        {!errors.username && form.username && (
          <>
            {usernameStatus === "checking" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
              </p>
            )}
            {usernameStatus === "invalid" && (
              <p className="text-xs text-destructive">Min 3 chars, letters, numbers, _ only</p>
            )}
            {usernameStatus === "available" && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Username available
              </p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Username not available
              </p>
            )}
          </>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={form.email} onChange={set("email")} className="glass" />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <CountrySelect id="country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" value={form.password} onChange={set("password")} className="glass" />
          {!errors.password && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput id="confirmPassword" value={form.confirmPassword} onChange={set("confirmPassword")} className="glass" />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>
      </div>
      <Turnstile ref={captchaRef} onToken={setCaptchaToken} />
      <Button type="submit" disabled={submitting || usernameStatus === "taken" || usernameStatus === "checking"} className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow">
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}