import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROD_HOST_SUFFIX = "codebreakers.uk";

function isProdOrigin(origin?: string | null): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === PROD_HOST_SUFFIX || host.endsWith(`.${PROD_HOST_SUFFIX}`);
  } catch {
    return false;
  }
}

async function verifyTurnstile(token: unknown, remoteIp?: string | null, origin?: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  // Preview hosts render Cloudflare's test widget (the production key is only
  // registered for the live domain), so verify those tokens with the test secret.
  const secret = isProdOrigin(origin)
    ? Deno.env.get("TURNSTILE_SECRET_KEY")
    : "1x0000000000000000000000000000000AA";
  if (!secret) return false;
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (remoteIp) form.append("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch { return false; }
}

// Resolves username -> email server-side and signs in with password without
// ever revealing the email to the client. Returns Supabase session tokens.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { username, password, captchaToken } = await req.json();
    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    if (!(await verifyTurnstile(captchaToken, ip))) {
      return new Response(JSON.stringify({ error: "captcha failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Look up the profile → auth.users email using an admin query.
    const { data: prof } = await admin.from("profiles").select("id").ilike("username", username.trim()).maybeSingle();
    if (!prof?.id) {
      return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: userRes } = await admin.auth.admin.getUserById(prof.id);
    const email = userRes?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sign in with the anon client to produce a normal session for the caller.
    const anon = createClient(url, anonKey);
    const { data: sess, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !sess?.session) {
      return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
