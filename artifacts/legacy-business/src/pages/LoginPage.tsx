import { useState } from "react";
import { useLocation, Link } from "wouter";
import { login } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Eye, EyeOff, Loader2, LogOut, ArrowRight,
  Shield, CheckCircle2, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth, isAuthenticated, isSuperAdmin, isLoading, user, company, logout } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", password: "", companyCode: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Show full-screen spinner while auth state is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-slate-400 text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  // Already signed in as a company user — show clear options
  if (isAuthenticated && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-white">Legacy Business</h1>
            <p className="text-slate-400 mt-1">ERP Management System</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Already signed in</p>
                <p className="text-slate-400 text-sm">{user?.name} · {company?.name || user?.username}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setLocation("/dashboard")}>
              <ArrowRight className="w-4 h-4 mr-2" />
              Continue to Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
                setLoggingOut(false);
              }}
            >
              {loggingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
              {loggingOut ? "Signing out…" : "Sign out and use different account"}
            </Button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/super" className="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Super Admin Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already signed in as super admin visiting /login — redirect them cleanly
  if (isAuthenticated && isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/50 border border-red-900/50 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Super Admin session active</p>
                <p className="text-slate-400 text-sm">You are signed in as {user?.name}</p>
              </div>
            </div>
            <Button className="w-full bg-red-700 hover:bg-red-600" onClick={() => setLocation("/super/dashboard")}>
              <ArrowRight className="w-4 h-4 mr-2" />Go to Super Admin Panel
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
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
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password || !form.companyCode) {
      toast({ title: "All fields required", description: "Please enter Company Code, Username, and Password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await login(form.username.trim(), form.password, form.companyCode.trim().toUpperCase());
      setAuth(data.user, data.company);
      toast({ title: `Welcome back, ${data.user.name}!`, description: `Signed in to ${data.company?.name || "your account"}` });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-erp.jpg"
            alt="Legacy Business ERP"
            className="h-16 w-auto object-contain mb-4 rounded-xl shadow-lg"
            onError={e => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className = "w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30";
              fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8"/><path d="M18 9h2a2 2 0 0 1 2 2v11"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
              img.parentElement?.insertBefore(fallback, img.nextSibling);
            }}
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">Legacy Business</h1>
          <p className="text-slate-400 mt-1 text-sm">ERP Management System</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
            <p className="text-slate-400 text-sm mt-0.5">Enter your company code and credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Company Code */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Company Code</Label>
              <Input
                className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 h-11 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. DEMO01"
                value={form.companyCode}
                onChange={e => setForm(f => ({ ...f, companyCode: e.target.value.toUpperCase() }))}
                autoComplete="off"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Username</Label>
              <Input
                className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 h-11 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  className="bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-500 h-11 rounded-xl pr-11 focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Enter your password"
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
                  {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-medium text-sm mt-2"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
                : <><ArrowRight className="w-4 h-4 mr-2" />Sign In</>
              }
            </Button>
          </form>
        </div>

        {/* Super Admin Link */}
        <div className="mt-5 text-center">
          <Link href="/super" className="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5 group">
            <Shield className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
            <span>Super Administrator Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
