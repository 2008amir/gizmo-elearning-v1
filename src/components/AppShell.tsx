import { type ReactNode, useState } from "react";
import { Search, User, Settings, Shield, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";

export function AppShell({ children, title, search, onSearchChange, searchPlaceholder, standalone, onBack }: {
  children: ReactNode;
  title?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  standalone?: boolean;
  onBack?: () => void;
}) {
  const { profile, user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState("");
  const s = search ?? localSearch;
  const onS = onSearchChange ?? setLocalSearch;
  const initials = ((profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "")).toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? "U");

  if (standalone) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-background">
          <header className="gizmo-header-bg sticky top-0 z-30 h-14 border-b border-border flex items-center gap-2 px-3 md:px-4 text-sidebar-foreground">
            <button
              onClick={() => (onBack ? onBack() : navigate({ to: "/dashboard" }))}
              className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary transition"
              aria-label="Back"
            >
              <span className="text-lg leading-none">←</span> Back
            </button>
            {title && <h1 className="font-semibold text-sm md:text-base truncate ml-2">{title}</h1>}
          </header>
          <main className="min-w-0">{children}</main>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1 min-w-0">
            <header className="gizmo-header-bg sticky top-0 z-30 h-14 border-b border-border flex items-center gap-2 px-3 md:px-4 text-sidebar-foreground">
              <SidebarTrigger />
              {title && <h1 className="font-semibold text-sm md:text-base truncate">{title}</h1>}
              <div className="ml-auto flex items-center gap-2 md:gap-3">
                <div className="relative hidden md:block w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={s} onChange={(e) => onS(e.target.value)} placeholder={searchPlaceholder ?? "Search..."} className="pl-9 h-9" />
                </div>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full ring-2 ring-border hover:ring-primary transition">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="gradient-bg text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="font-semibold">{profile?.first_name} {profile?.last_name}</div>
                      <div className="text-xs text-muted-foreground font-normal">@{profile?.username}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}><User className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/account/settings" as never })}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/account/security" as never })}><Shield className="mr-2 h-4 w-4" /> Security</DropdownMenuItem>
                    {isAdmin && <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>Admin Panel</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            {onSearchChange && (
              <div className="md:hidden px-3 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={s} onChange={(e) => onS(e.target.value)} placeholder={searchPlaceholder ?? "Search..."} className="pl-9 h-9" />
                </div>
              </div>
            )}
            <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
          </SidebarInset>
        </div>
        <MobileBottomNav />
      </SidebarProvider>
    </RequireAuth>
  );
}
