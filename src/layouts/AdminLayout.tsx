import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Award, Building2, Users, BarChart3, LogOut, Settings, Shield, Menu, FileText, Key, Webhook, ChevronDown } from "lucide-react";
import badgenestLogo from "@/assets/badgenest-logo.png";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navGroups = [
  {
    label: "Management",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Badges", href: "/admin/badges", icon: Award },
      { label: "Issuers", href: "/admin/issuers", icon: Building2 },
      { label: "Assertions", href: "/admin/assertions", icon: Shield },
      { label: "Learners", href: "/admin/learners", icon: Users },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Audit Log", href: "/admin/audit-log", icon: FileText },
    ],
  },
  {
    label: "Integrations",
    items: [
      { label: "API Keys", href: "/admin/api-keys", icon: Key },
      { label: "Webhooks", href: "/admin/webhooks", icon: Webhook },
    ],
  },
];

function NavItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {/* Left accent bar */}
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
                  )}
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "A";

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <img src={badgenestLogo} alt="BadgeNest" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <NavItems pathname={location.pathname} />
        </nav>
        {/* Admin card at bottom */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-sidebar-accent text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{profile?.full_name || "Admin"}</p>
              <Badge variant="secondary" className="mt-0.5 text-[9px] px-1.5 py-0 h-4 bg-sidebar-primary/20 text-sidebar-primary border-0">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col bg-background">
        <header className="sticky top-0 z-40 glass">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-0">
                  <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
                    <img src={evolveLogo} alt="Evolve Careers" className="h-8 w-auto brightness-0 invert" />
                  </div>
                  <nav className="flex-1 px-3 py-5">
                    <NavItems pathname={location.pathname} onNavigate={() => setMobileOpen(false)} />
                  </nav>
                </SheetContent>
              </Sheet>
              <img src={evolveLogo} alt="Evolve Careers" className="h-8 w-auto" />
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full gap-2 pl-1 pr-2 h-10 hover:bg-muted/80">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><Settings className="mr-2 h-4 w-4" />Learner View</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
