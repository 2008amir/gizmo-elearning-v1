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
    <!-- Header -->
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
    <!-- Accent bars -->
    <div style="height:6px;background:#1e3a8a;"></div>
    <div style="height:2px;background:#ffffff;"></div>

    <!-- Body -->
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

    <!-- OTP -->
    <div style="padding:8px 40px 24px;background:#ffffff;text-align:center;">
      <div style="font-size:14px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">Your OTP Code</div>
      <div style="display:inline-block;padding:18px 36px;border:2px solid #1e3a8a;border-radius:10px;font-size:42px;font-weight:800;letter-spacing:14px;color:#1e3a8a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${otp}</div>
      <p style="margin:22px 0 0;color:#475569;font-size:14px;line-height:1.6;">This OTP has been sent to <span style="color:#1e3a8a;font-weight:700;">${email}</span>. Please enter this code on the verification page to proceed.</p>
    </div>

    <!-- Security notice -->
    <div style="padding:0 40px 24px;background:#ffffff;">
      <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:16px 18px;display:flex;align-items:flex-start;gap:12px;">
        <div style="min-width:36px;width:36px;height:36px;border-radius:50%;background:#1e3a8a;color:#ffffff;text-align:center;line-height:36px;font-size:18px;font-weight:800;">🛡</div>
        <div style="color:#0f172a;font-size:13px;line-height:1.55;">
          <div style="margin-bottom:4px;">For your security, do not share this code with anyone.</div>
          <div>If you did not request this, please ignore this email.</div>
        </div>
      </div>
    </div>

    <!-- Expiry & date -->
    <div style="padding:0 40px 32px;background:#ffffff;text-align:center;color:#334155;font-size:14px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;">
        This code will expire in <span style="color:#1e3a8a;font-weight:700;">${expiresIn}</span>.
      </div>
      <div style="margin-top:8px;">
        Date &amp; Time: <span style="color:#1e3a8a;font-weight:700;">${dateTime}</span>
      </div>
    </div>

    <!-- Footer accent bars -->
    <div style="height:2px;background:#ffffff;"></div>
    <div style="height:6px;background:#1e3a8a;"></div>
    <div style="background:#1e3a8a;color:#ffffff;text-align:center;font-size:12px;padding:14px 20px;">© ${year} Gizmore Office Plus. All rights reserved.</div>
  </div>
</body></html>`;
}

async function sendBrevo(to: string, name: string, otp: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const sender = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply-gizmo@codebreakers.uk";
  if (!apiKey) throw new Error("BREVO_API_KEY not configured");
  const now = new Date();
  const dateTime = now.toUTCString();
  const html = otpEmailHtml({
    otp,
    email: to,
    heading: "Verify Your Email Address",
    description: `Thank you for choosing Gizmore Office Plus. To complete your verification, please use the One-Time Password (OTP) <strong style="color:#1e3a8a;">${otp}</strong> below. This code is valid for a limited time only.`,
    expiresIn: "10 minutes",
    dateTime,
    year: now.getUTCFullYear(),
  });
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Gizmore Office Plus", email: sender },
      to: [{ email: to, name: name || to }],
      subject: `Your Gizmore verification code: ${otp}`,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }
}

async function verifyTurnstile(token: unknown, remoteIp?: string | null): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
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
    const password = String(body.password || "");
    const firstName = String(body.firstName || "").trim().slice(0, 60);
    const lastName = String(body.lastName || "").trim().slice(0, 60);
    const username = String(body.username || "").trim().slice(0, 30);
    const country = String(body.country || "").trim().slice(0, 60);
    const captchaToken = body.captchaToken;

    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
    if (!(await verifyTurnstile(captchaToken, ip))) return json({ error: "Captcha verification failed" }, 400);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid email" }, 400);

    // Resend path: reuse the pending signup already stored for this email so the
    // user does not have to re-enter their password to get a fresh code.
    if (body.resend === true) {
      const adminResend = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: pending } = await adminResend
        .from("pending_signups")
        .select("email, first_name")
        .eq("email", email)
        .maybeSingle();
      if (!pending) return json({ error: "No pending signup found for this email. Please sign up again." }, 400);

      const newOtp = String(Math.floor(100000 + Math.random() * 900000));
      const { error: resendErr } = await adminResend
        .from("pending_signups")
        .update({
          otp_code: newOtp,
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .eq("email", email);
      if (resendErr) return json({ error: resendErr.message }, 200);

      await sendBrevo(email, String(pending.first_name || ""), newOtp);
      return json({ ok: true });
    }

    if (password.length < 8) return json({ error: "invalid password" }, 400);
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return json({ error: "invalid username" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Make sure the email isn't already registered
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (existingProfile) return json({ error: "Username already taken" }, 400);

    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersList?.users?.some((u) => (u.email || "").toLowerCase() === email)) {
      return json({ error: "An account with this email already exists" }, 400);
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Upsert on email
    const { error: upErr } = await admin
      .from("pending_signups")
      .upsert(
        {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          username,
          country,
          otp_code: otp,
          attempts: 0,
          expires_at: expires,
        },
        { onConflict: "email" },
      );
    if (upErr) return json({ error: upErr.message }, 200);

    await sendBrevo(email, firstName, otp);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 200);
  }
});
