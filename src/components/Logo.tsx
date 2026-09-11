import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.png";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="group inline-grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors hover:bg-background/20"
    >
      <img
        src={logoSrc}
        alt="Gizmo Office Plus logo"
        className="h-10 w-10 shrink-0 rounded-sm object-cover shadow-elegant transition-transform group-hover:scale-105"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-bold text-sidebar-foreground">Gizmo Dan Kaita</div>
        <div className="-mt-0.5 text-[10px] uppercase tracking-widest text-sidebar-foreground/75">//CODEBREAKERS</div>
      </div>
    </Link>
  );
}
