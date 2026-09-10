import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "system" | "light" | "dark";
const STORAGE_KEY = "theme-pref";

type Ctx = { pref: ThemePref; setPref: (p: ThemePref) => void; resolved: "light" | "dark" };
const ThemeCtx = createContext<Ctx | undefined>(undefined);

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("theme-light", resolved === "light");
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) as ThemePref | null;
    const initial: ThemePref = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setPrefState(initial);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const compute = () => {
      const r = pref === "system" ? (mq.matches ? "light" : "dark") : pref;
      setResolved(r);
      applyTheme(r);
    };
    compute();
    const listener = () => pref === "system" && compute();
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch { /* ignore */ }
  };

  return <ThemeCtx.Provider value={{ pref, setPref, resolved }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
