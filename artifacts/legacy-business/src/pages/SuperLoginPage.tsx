import { useState } from "react";
import { useLocation, Link } from "wouter";
import { login } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2, ArrowLeft, LogOut, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SuperLoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth, isAuthenticated, isSuperAdmin, isLoading, user, logout } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Show spinner while auth state is resolving
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-red-600/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-red-400 animate-pulse" />
          </div>
          <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          <p className="text-slate-400 text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  // Already signed in as super admin
  if (isAuthenticated && isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-900/50">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Super Admin</h1>
            <p className="text-slate-400 mt-1 text-sm">Legacy Business ERP</p>
          </div>
          <div className="bg-slate-900/80 border border-red-900/50 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Super Admin session active</p>
                <p className="text-slate-400 text-sm">{user?.name} · Super Administrator</p>
              </div>
            </div>
            <Button className="w-full bg-red-700 hover:bg-red-600" onClick={() => setLocation("/super/dashboard")}>
              <ArrowRight className="w-4 h-4 mr-2" />Go to Control Panel
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
                setLoggingOut(false);
              }}
            >
              {loggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              {loggingOut ? "Signing out…" : "Sign out completely"}
            </Button>
            <div className="text-center pt-1">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />Back to Company Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Already signed in as company user — show them clear options
  if (isAuthenticated && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <p className="text-white font-medium">You are signed in as a company user</p>
            <p className="text-slate-400 text-sm">Super Admin access requires a separate account. Please sign out first.</p>
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
                setLoggingOut(false);
              }}
            >
              {loggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />Back to Company Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast({ title: "Required", description: "Enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await login(form.username.trim(), form.password, "SUPER");
      setAuth(data.user, data.company);
      toast({ title: "Access granted", description: `Welcome, ${data.user.name}` });
      setLocation("/super/dashboard");
    } catch (err: any) {
      toast({ title: "Access denied", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-owner.png"
            alt="Legacy Business Owner"
            className="h-16 w-auto object-contain mb-4 rounded-xl shadow-lg shadow-red-900/30"
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              img.insertAdjacentHTML("afterend", `<div class="relative mb-4"><div class="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/60"><svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg></div><div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center"><span class="text-[9px] font-black text-black">SA</span></div></div>`);
            }}
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">Legacy Business Owner</h1>
          <p className="text-slate-400 mt-1 text-sm">Super Administrator — Restricted Area</p>
        </div>

        {/* Warning badge */}
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-2.5 mb-5">
          <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">This area is restricted to authorized administrators only. All access is logged.</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-red-900/40 rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold text-white">Administrator Login</h2>
            <p className="text-slate-400 text-sm mt-0.5">Enter super admin credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Admin Username</Label>
              <Input
                className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-xl focus:border-red-600 focus:ring-1 focus:ring-red-600"
                placeholder="Enter admin username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 h-11 rounded-xl pr-11 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-medium bg-red-700 hover:bg-red-600 text-white mt-2"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Authenticating…</>
                : <><Shield className="w-4 h-4 mr-2" />Access Control Panel</>
              }
            </Button>
          </form>

          <div className="px-6 pb-5 border-t border-slate-800 pt-4 text-center">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Company Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
