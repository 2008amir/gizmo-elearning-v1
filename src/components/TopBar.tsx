import { useNavigate } from "@tanstack/react-router";
import { Search, User, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  homeTo: string;
  profileTo: string;
  placeholder?: string;
};

export function TopBar({ search, onSearchChange, homeTo, profileTo, placeholder }: Props) {
  const { profile, user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const initials = ((profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "")).toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? "U");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
        {/* Row 1: logo + profile */}
        <div className="flex items-center justify-between">
          <Logo to={homeTo as never} />
          <div className="flex items-center gap-1">
            <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-2 ring-border transition-all duration-200 hover:ring-primary focus-visible:outline-none focus-visible:ring-primary">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{profile?.first_name} {profile?.last_name}</div>
                <div className="text-xs text-muted-foreground font-normal">@{profile?.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: profileTo as never })}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate({ to: "/admin" as never })}>Admin Panel</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
        {/* Row 2: search bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder ?? "Search..."}
            className="pl-9 bg-secondary/60 border-border"
          />
        </div>
      </div>
    </header>
  );
}
