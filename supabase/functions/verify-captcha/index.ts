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

export async function verifyTurnstile(token: unknown, remoteIp?: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  // Server-only secret; every environment validates against the real Cloudflare
  // siteverify endpoint. No test/bypass path.
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return false;
  try {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (remoteIp) form.append("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    const ok = await verifyTurnstile(token, ip, req.headers.get("origin") || req.headers.get("referer"));
    if (!ok) return json({ error: "captcha failed" }, 400);
    return json({ ok: true });
  } catch {
    return json({ error: "captcha failed" }, 400);
  }
});
