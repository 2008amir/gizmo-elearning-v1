import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    if (!/^\d{6}$/.test(code)) return json({ error: "Invalid code" }, 200);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rec } = await admin.from("password_reset_otps").select("*").eq("email", email).maybeSingle();
    if (!rec) return json({ error: "No reset request found" }, 200);
    if (new Date(rec.expires_at).getTime() < Date.now()) {
      await admin.from("password_reset_otps").delete().eq("email", email);
      return json({ error: "Code expired" }, 200);
    }
    if (rec.otp_code !== code) {
      const attempts = (rec.attempts || 0) + 1;
      if (attempts >= 5) {
        await admin.from("password_reset_otps").delete().eq("email", email);
        return json({ error: "Too many attempts. Please request a new code." }, 200);
      }
      await admin.from("password_reset_otps").update({ attempts, updated_at: new Date().toISOString() }).eq("email", email);
      return json({ error: "Incorrect code" }, 200);
    }
    await admin.from("password_reset_otps").update({ verified: true, updated_at: new Date().toISOString() }).eq("email", email);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 200);
  }
});
