import { useState } from "react";
import Footer from "./Footer";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Building2, Users, CreditCard, Settings, Bell, LogOut,
  Menu, X, Shield, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/super/dashboard" },
  { label: "Companies", icon: Building2, href: "/super/companies" },
  { label: "Users", icon: Users, href: "/super/users" },
  { label: "Subscriptions", icon: CreditCard, href: "/super/subscriptions" },
  { label: "Notifications", icon: Bell, href: "/super/notifications" },
  { label: "Settings", icon: Settings, href: "/super/settings" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    setLocation("/super");
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <aside className={cn(
        "flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300",
        sidebarOpen ? "w-60" : "w-16"
      )}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 h-16">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && <span className="text-white font-bold text-sm">Super Admin</span>}
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
                  active ? "bg-red-700/30 text-red-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-red-400")} />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-slate-800">
          {sidebarOpen && (
            <div className="px-3 py-2 mb-2">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs">Super Administrator</p>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 text-sm transition-all">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center px-4 gap-4 bg-slate-900">
          <button onClick={() => setSidebarOpen(p => !p)} className="text-slate-400 hover:text-white">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="text-slate-500">Super Admin</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{navItems.find(n => location.startsWith(n.href))?.label ?? "Dashboard"}</span>
          </div>
          <div className="ml-auto">
            <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-900/50">RESTRICTED</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
          <Footer dark />
        </main>
      </div>
    </div>
  );
}
