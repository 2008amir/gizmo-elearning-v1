import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo.png";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <img
        src={logoSrc}
        alt="Gizmo Office Plus logo"
        className="h-10 w-10 rounded-full object-cover glow group-hover:scale-105 transition-transform"
      />
      <div className="leading-tight">
        <div className="font-bold text-base gradient-text">Gizmo Office Plus</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">//CODEBREAKERS</div>
      </div>
    </Link>
  );
}
