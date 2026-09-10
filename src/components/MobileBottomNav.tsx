import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, Bot, ClipboardList, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/chat", label: "Contact", Icon: MessageCircle },
  { to: "/ai-chat", label: "AI", Icon: Bot },
  { to: "/assignments", label: "Assignments", Icon: ClipboardList },
  { to: "/market", label: "Market", Icon: Store },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur h-16">
      <ul className="grid grid-cols-5 h-full">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <li key={to} className="h-full">
              <Link
                to={to as never}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium leading-tight transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-[27px] w-[27px]", active && "text-primary")} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
