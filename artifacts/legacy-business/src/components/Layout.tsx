import { useLocation, Link } from "wouter";
import Footer from "./Footer";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, FileText, Package, Briefcase, ShoppingCart,
  IndianRupee, BarChart3, Bell, Settings, LogOut, Moon, Sun, Menu,
  Truck, UserCheck, Wallet, Zap, Building2, MessageSquare, BookOpen, BookMarked,
  RotateCcw, Banknote, HardDrive, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/auth";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Billing", href: "/billing", icon: FileText },
  { label: "Purchase", href: "/purchase", icon: ShoppingCart },
  { label: "Returns", href: "/returns", icon: RotateCcw },
  { label: "Payments", href: "/payments", icon: IndianRupee },
  { label: "Cash & Bank", href: "/cash-bank", icon: Banknote },
  { label: "HR", href: "/hr", icon: UserCheck },
  { label: "Salary", href: "/salary", icon: Wallet },
  { label: "E-Way Bill", href: "/eway-bill", icon: Zap },
  { label: "Ledger", href: "/ledger", icon: BookOpen },
  { label: "Day Book", href: "/daybook", icon: BookMarked },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Messaging", href: "/messaging", icon: MessageSquare },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Backup", href: "/backup", icon: HardDrive },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, company, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadData } = useQuery({ queryKey: ["msg-unread"], queryFn: () => apiFetch("/messages/unread").then(r => r.json()), refetchInterval: 30000 });
  const unreadCount = unreadData?.count ?? 0;

  const handleLogout = async () => { await logout(); setLocation("/login"); };

  const NavLinks = ({ close }: { close?: () => void }) => (
    <div className="flex flex-col gap-0.5">
      {NAV.map(item => {
        const active = location.startsWith(item.href);
        const badge = item.href === "/messaging" && unreadCount > 0 ? unreadCount : 0;
        return (
          <Link key={item.href} href={item.href} onClick={close}>
            <span className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-4">{badge}</Badge>}
            </span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-3 border-b bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
          ) : (
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-bold text-sm">{company?.name || "Legacy Business"}</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 flex flex-col p-4 border-r">
            <div className="flex items-center gap-2 mb-4">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div>
                <p className="font-bold text-sm">{company?.name || "Legacy Business"}</p>
                <p className="text-xs text-muted-foreground">{company?.code}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto"><NavLinks close={() => setMobileOpen(false)} /></div>
            <div className="border-t pt-3 mt-3 space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); }}>
                {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>
              <Link href="/settings" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start"><Settings className="h-4 w-4 mr-2" />Settings</Button>
              </Link>
              <div className="mt-2 pt-2 border-t border-dashed border-destructive/30">
                <Button variant="outline" size="sm" className="w-full justify-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden md:flex flex-col w-56 xl:w-64 border-r bg-card min-h-screen sticky top-0 h-screen">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{company?.name || "Legacy Business"}</p>
              <p className="text-xs text-muted-foreground">{company?.code}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>

        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg w-full hover:bg-muted transition-colors text-left">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="h-4 w-4 mr-2" />Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
