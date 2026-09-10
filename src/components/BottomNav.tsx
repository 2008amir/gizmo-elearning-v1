import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Bookmark, Bot, MessageCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Courses", Icon: BookOpen },
  { to: "/saved", label: "Saved", Icon: Bookmark },
  { to: "/ai-chat", label: "AI Chat", Icon: Bot },
  { to: "/chat", label: "Chat", Icon: MessageCircle },
  { to: "/market", label: "Market", Icon: Store },
];

export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <ul className="grid grid-cols-5 max-w-lg mx-auto">
        {ITEMS.map(({ to, label, Icon }) => {
          const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to as never}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
