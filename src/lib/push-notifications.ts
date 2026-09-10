// Browser web-push subscription & in-tab Notification API helpers.
// The service worker at /sw.js handles background OS notifications when the
// site is closed. We only register it on the published production origin —
// never in the Lovable preview iframe or in dev.
import { supabase } from "@/integrations/supabase/client";

function isPreviewIframe(): boolean {
  if (typeof window === "undefined") return true;
  // Only skip when running inside the Lovable editor preview iframe —
  // service workers can't register there. Any published origin
  // (lovable.app, custom domains, etc.) is allowed.
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}

/** Show a local OS notification for a notification row we just received via realtime. */
export function showLocalNotification(title: string, options: NotificationOptions & { link?: string } = {}) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, { icon: "/favicon.png", badge: "/favicon.png", ...options });
  n.onclick = () => {
    window.focus();
    if (options.link) window.location.assign(options.link);
    n.close();
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

/** Register /sw.js (production only) and subscribe to web push if a VAPID key is configured. */
export async function initPushForCurrentUser(userId: string) {
  if (isPreviewIframe()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
  if (!reg) return;

  const { VAPID_PUBLIC_KEY } = await import("./vapid-public");
  const vapid = VAPID_PUBLIC_KEY;
  if (!vapid) return;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid).buffer as ArrayBuffer,
      });
    } catch {
      return;
    }
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await supabase.from("push_subscriptions" as never).upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    } as never,
    { onConflict: "endpoint" } as never,
  );
}
