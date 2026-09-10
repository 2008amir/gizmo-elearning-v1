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

function otpEmailHtml(opts: { otp: string; email: string; heading: string; description: string; expiresIn: string; dateTime: string; year: number; }) {
  const { otp, email, heading, description, expiresIn, dateTime, year } = opts;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="padding:28px 32px 20px;background:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="vertical-align:middle;padding-right:14px;">
              <div style="width:56px;height:56px;background:#1e3a8a;border-radius:6px;display:inline-block;text-align:center;line-height:56px;color:#ffffff;font-weight:800;font-size:34px;font-family:Arial,sans-serif;">G</div>
            </td>
            <td style="vertical-align:middle;text-align:left;">
              <div style="font-size:26px;font-weight:800;color:#1e3a8a;letter-spacing:1px;">GIZMORE OFFICE PLUS</div>
              <div style="font-size:12px;font-weight:600;color:#1e3a8a;letter-spacing:6px;margin-top:2px;">//CODEBREAKERS//</div>
            </td>
          </tr></table>
        </td>
      </tr></table>
    </div>
    <div style="height:6px;background:#1e3a8a;"></div>
    <div style="height:2px;background:#ffffff;"></div>

    <div style="padding:32px 40px 8px;background:#ffffff;text-align:center;">
      <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:#eff6ff;line-height:72px;">
        <span style="font-size:34px;color:#1e3a8a;">✉︎🔒</span>
      </div>
      <h1 style="margin:22px 0 6px;font-size:28px;color:#1e3a8a;font-weight:800;">${heading}</h1>
      <div style="width:60px;height:3px;background:#1e3a8a;margin:0 auto 24px;"></div>
    </div>

    <div style="padding:0 40px;background:#ffffff;color:#0f172a;font-size:15px;line-height:1.6;">
      <p style="margin:0 0 12px;">Hello,</p>
      <p style="margin:0 0 20px;color:#334155;">${description}</p>
    </div>

    <div style="padding:8px 40px 24px;background:#ffffff;text-align:center;">
      <div style="font-size:14px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">Your OTP Code</div>
      <div style="display:inline-block;padding:18px 36px;border:2px solid #1e3a8a;border-radius:10px;font-size:42px;font-weight:800;letter-spacing:14px;color:#1e3a8a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${otp}</div>
      <p style="margin:22px 0 0;color:#475569;font-size:14px;line-height:1.6;">This OTP has been sent to <span style="color:#1e3a8a;font-weight:700;">${email}</span>. Please enter this code on the verification page to proceed.</p>
    </div>

    <div style="padding:0 40px 24px;background:#ffffff;">
      <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:16px 18px;display:flex;align-items:flex-start;gap:12px;">
        <div style="min-width:36px;width:36px;height:36px;border-radius:50%;background:#1e3a8a;color:#ffffff;text-align:center;line-height:36px;font-size:18px;font-weight:800;">🛡</div>
        <div style="color:#0f172a;font-size:13px;line-height:1.55;">
          <div style="margin-bottom:4px;">For your security, do not share this code with anyone.</div>
          <div>If you did not request this, please ignore this email.</div>
        </div>
      </div>
    </div>

    <div style="padding:0 40px 32px;background:#ffffff;text-align:center;color:#334155;font-size:14px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;">
        This code will expire in <span style="color:#1e3a8a;font-weight:700;">${expiresIn}</span>.
      </div>
      <div style="margin-top:8px;">
        Date &amp; Time: <span style="color:#1e3a8a;font-weight:700;">${dateTime}</span>
      </div>
    </div>

    <div style="height:2px;background:#ffffff;"></div>
    <div style="height:6px;background:#1e3a8a;"></div>
    <div style="background:#1e3a8a;color:#ffffff;text-align:center;font-size:12px;padding:14px 20px;">© ${year} Gizmore Office Plus. All rights reserved.</div>
  </div>
</body></html>`;
}

async function sendBrevo(to: string, otp: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const sender = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply-gizmo@codebreakers.uk";
  if (!apiKey) throw new Error("BREVO_API_KEY not configured");
  const now = new Date();
  const html = otpEmailHtml({
    otp,
    email: to,
    heading: "Reset Your Password",
    description: `We received a request to reset your Gizmore Office Plus password. Please use the One-Time Password (OTP) <strong style="color:#1e3a8a;">${otp}</strong> below to continue. This code is valid for a limited time only.`,
    expiresIn: "10 minutes",
    dateTime: now.toUTCString(),
    year: now.getUTCFullYear(),
  });
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Gizmore Office Plus", email: sender },
      to: [{ email: to }],
      subject: `Your Gizmore password reset code: ${otp}`,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    if (!(await verifyTurnstile(body.captchaToken, ip, req.headers.get("origin") || req.headers.get("referer")))) return json({ error: "Captcha verification failed" }, 200);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Invalid email" }, 200);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check user exists
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const exists = usersList?.users?.some((u) => (u.email || "").toLowerCase() === email);
    if (!exists) return json({ error: "User does not exist" }, 200);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upErr } = await admin
      .from("password_reset_otps")
      .upsert({ email, otp_code: otp, attempts: 0, verified: false, expires_at: expires, updated_at: new Date().toISOString() }, { onConflict: "email" });
    if (upErr) return json({ error: upErr.message }, 200);

    await sendBrevo(email, otp);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 200);
  }
});
