import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, GraduationCap, Route as RouteIcon, ClipboardList,
  Award, Bot, MessageCircle, CalendarDays, User, Settings, Shield,
  Building2, Users, BarChart3, Cog, HelpCircle, LogOut, Store, UsersRound,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import logoSrc from "@/assets/logo.png";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; items: Item[] };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const learning: Group = {
  title: "Learning", icon: BookOpen, items: [
    { title: "All Courses", url: "/learning/all", icon: BookOpen },
    { title: "My Courses", url: "/learning/my", icon: GraduationCap },
    { title: "Learning Path", url: "/learning/path", icon: RouteIcon },
  ],
};

const solo: Item[] = [
  { title: "Assignments", url: "/assignments", icon: ClipboardList },
  { title: "Certificates", url: "/certificates", icon: Award },
  { title: "Community", url: "/communities", icon: UsersRound },
  { title: "AI Assistant", url: "/ai-chat", icon: Bot },
  { title: "Contact Admin", url: "/chat", icon: MessageCircle },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Market", url: "/market", icon: Store },
];

const account: Group = {
  title: "Account", icon: User, items: [
    { title: "Profile", url: "/profile", icon: User },
    { title: "Settings", url: "/account/settings", icon: Settings },
    { title: "Security", url: "/account/security", icon: Shield },
  ],
};

const organisation: Group = {
  title: "Organisation", icon: Building2, items: [
    { title: "Users", url: "/organisation/users", icon: Users },
    { title: "Analytics", url: "/organisation/analytics", icon: BarChart3 },
    { title: "Management", url: "/organisation/management", icon: Cog },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");
  const groupActive = (g: Group) => g.items.some((i) => isActive(i.url));

  const renderGroup = (g: Group, open?: boolean) => (
    <Collapsible defaultOpen={open ?? groupActive(g)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <g.icon className="h-4 w-4" />
            {!collapsed && <><span>{g.title}</span><ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" /></>}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {!collapsed && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {g.items.map((i) => (
                <SidebarMenuSubItem key={i.url}>
                  <SidebarMenuSubButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url as never}><i.icon className="h-3.5 w-3.5" /><span>{i.title}</span></Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gizmo-header-bg border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-background/20">
          <img src={logoSrc} alt="Gizmo Dan Kaita Office Plus" className="h-8 w-8 shrink-0 rounded-sm border-[3px] border-white object-cover glow" />
          {!collapsed && (
            <div className="leading-tight min-w-0 text-shadow-md">
              <div className="truncate text-sm font-bold text-white">Gizmo Dan Kaita</div>
              <div className="text-[9px] uppercase tracking-widest text-white/90">//CODEBREAKERS</div>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url as never}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {renderGroup(learning, true)}
              {solo.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <Link to={i.url as never}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {renderGroup(account)}
              {isAdmin && renderGroup(organisation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/help")}>
                  <Link to={"/help" as never}><HelpCircle className="h-4 w-4" />{!collapsed && <span>Help</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="text-destructive">
              <LogOut className="h-4 w-4" />{!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
