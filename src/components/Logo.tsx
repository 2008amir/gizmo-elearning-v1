import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.png";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link
      to={to}
      className="group inline-grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md bg-primary-soft px-2.5 py-1.5 ring-1 ring-primary/30 transition-colors hover:bg-primary-soft/80"
    >
      <img
        src={logoSrc}
        alt="Gizmo Office Plus logo"
        className="h-10 w-10 shrink-0 rounded-sm object-cover glow transition-transform group-hover:scale-105"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-bold text-foreground">Gizmo Dan Kaita</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">//CODEBREAKERS</div>
      </div>
    </Link>
  );
}
