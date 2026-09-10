import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, code } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();
    if (!cleanEmail || !/^\d{6}$/.test(cleanCode)) return json({ error: "invalid code" }, 200);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pending } = await admin
      .from("pending_signups")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (!pending) return json({ error: "No pending signup found. Please sign up again." }, 200);
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await admin.from("pending_signups").delete().eq("email", cleanEmail);
      return json({ error: "Code expired. Please sign up again." }, 200);
    }
    if (pending.attempts >= 5) {
      await admin.from("pending_signups").delete().eq("email", cleanEmail);
      return json({ error: "Too many attempts. Please sign up again." }, 200);
    }
    if (pending.otp_code !== cleanCode) {
      await admin.from("pending_signups").update({ attempts: pending.attempts + 1 }).eq("email", cleanEmail);
      return json({ error: "Incorrect code" }, 200);
    }

    // Create the actual auth user with email pre-confirmed
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: pending.password,
      email_confirm: true,
      user_metadata: {
        first_name: pending.first_name,
        last_name: pending.last_name,
        username: pending.username,
        country: pending.country,
      },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || "Could not create account" }, 200);
    }

    // Clean up
    await admin.from("pending_signups").delete().eq("email", cleanEmail);

    // Sign in to return a session
    const anon = createClient(url, anonKey);
    const { data: sess, error: signInErr } = await anon.auth.signInWithPassword({
      email: cleanEmail,
      password: pending.password,
    });
    if (signInErr || !sess?.session) return json({ ok: true, sign_in_failed: true });
    return json({
      ok: true,
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 200);
  }
});
