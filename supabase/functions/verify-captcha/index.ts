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

export async function verifyTurnstile(token: unknown, remoteIp?: string | null, origin?: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  // The production site key is only registered for the live domain, so preview
  // hosts render Cloudflare's test widget; those tokens validate against the
  // matching test secret only.
  const secret = isProdOrigin(origin)
    ? Deno.env.get("TURNSTILE_SECRET_KEY")
    : "1x0000000000000000000000000000000AA";
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
