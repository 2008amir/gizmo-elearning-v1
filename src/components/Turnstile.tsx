import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SITE_KEY = "0x4AAAAAAD0YZS447RNAlkze";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Kick off the script load as soon as this module is imported so the widget
// can render immediately when the component mounts, rather than waiting for
// the effect to trigger the network request.
if (typeof window !== "undefined") {
  loadScript().catch(() => { /* noop */ });
}


export type TurnstileHandle = { reset: () => void };

export const Turnstile = forwardRef<TurnstileHandle, {
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}>(function Turnstile({ onToken, theme = "auto" }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const reset = () => {
    onTokenRef.current(null);
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* noop */ }
    }
  };

  useImperativeHandle(ref, () => ({ reset }));

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => {
            onTokenRef.current(null);
          },
          "expired-callback": () => {
            onTokenRef.current(null);
          },
        });
      })
      .catch(() => {
        /* ignore load errors; user can retry */
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
      }
      widgetIdRef.current = null;
    };
  }, [theme]);

  return <div ref={containerRef} className="flex justify-center" />;
});
