import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Database, HardDrive, Usb, Cloud, Network, ChevronRight,
  ChevronLeft, CheckCircle, Loader2, FolderOpen, Key, User, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { login } from "@/lib/auth";

// ─── Types ─────────────────────────────────────────────────────────────────────
type StorageOption = "local" | "external" | "usb" | "onedrive" | "network" | "custom";

interface LicenseInfo {
  companyName: string;
  maxUsers: number;
  maxDevices: number;
  maxBranches: number;
  plan: string;
  subscriptionExpiry: string | null;
}

interface WizardState {
  // Step 1 — storage
  storageType: StorageOption;
  dataPath: string;
  // Step 2 — license
  companyCode: string;
  licenseKey: string;
  licenseInfo: LicenseInfo | null;
  licenseVerified: boolean;
  // Step 3 — owner account
  ownerUsername: string;
  ownerPassword: string;
  ownerPasswordConfirm: string;
  ownerName: string;
}

const STORAGE_OPTIONS: { id: StorageOption; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
  { id: "local",    label: "C: Drive (Local)",           description: "Store on the main drive. Fast and reliable. Recommended for desktop setups.",       icon: <HardDrive className="w-5 h-5" />, badge: "Recommended" },
  { id: "external", label: "D: Drive / External HDD",    description: "Store on a secondary or external hard drive. Good for separating data from the OS.", icon: <HardDrive className="w-5 h-5" /> },
  { id: "usb",      label: "USB Pen Drive",               description: "Portable storage. Keep the pen drive plugged in while the app is running.",          icon: <Usb className="w-5 h-5" /> },
  { id: "onedrive", label: "OneDrive Folder",             description: "Automatically syncs to Microsoft cloud. Best for data safety.",                      icon: <Cloud className="w-5 h-5" /> },
  { id: "network",  label: "Network / Shared Folder",     description: "Store on a shared company server or NAS device. For multi-computer setups.",         icon: <Network className="w-5 h-5" /> },
  { id: "custom",   label: "Custom Folder",               description: "Specify any folder path on this computer or network.",                               icon: <FolderOpen className="w-5 h-5" /> },
];

const DEFAULT_PATHS: Record<StorageOption, string> = {
  local:    "C:\\LegacyBusinessERP\\data",
  external: "D:\\LegacyBusinessERP\\data",
  usb:      "E:\\LegacyBusinessERP\\data",
  onedrive: "%USERPROFILE%\\OneDrive\\LegacyBusinessERP\\data",
  network:  "\\\\server\\shared\\LegacyBusinessERP\\data",
  custom:   "",
};

const STEPS = ["Welcome", "Data Folder", "License", "Owner Account", "Complete"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiPost(path: string, body: object) {
  const r = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

export default function SetupWizard() {
  const [, navigate] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [state, setState] = useState<WizardState>({
    storageType: "local",
    dataPath: DEFAULT_PATHS["local"],
    companyCode: "",
    licenseKey: "",
    licenseInfo: null,
    licenseVerified: false,
    ownerUsername: "",
    ownerPassword: "",
    ownerPasswordConfirm: "",
    ownerName: "",
  });
  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  // ── Step 1: Data Folder ──────────────────────────────────────────────────────
  const renderDataFolder = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Where should data be stored?</h2>
        <p className="text-muted-foreground text-sm mt-1">Choose where Legacy Business ERP will store your database and backup files.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STORAGE_OPTIONS.map(opt => (
          <div
            key={opt.id}
            className={cn(
              "relative p-3 rounded-xl border-2 cursor-pointer transition-all",
              state.storageType === opt.id ? "border-primary bg-primary/5" : "border-muted/50 hover:border-muted hover:bg-muted/10"
            )}
            onClick={() => update({ storageType: opt.id, dataPath: DEFAULT_PATHS[opt.id] })}
          >
            {opt.badge && <Badge className="absolute -top-2 right-3 text-xs bg-green-600">{opt.badge}</Badge>}
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 shrink-0", state.storageType === opt.id ? "text-primary" : "text-muted-foreground")}>
                {opt.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
              {state.storageType === opt.id && <CheckCircle className="w-4 h-4 text-primary shrink-0 ml-auto mt-0.5" />}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label>Data Folder Path</Label>
        <Input
          value={state.dataPath}
          onChange={e => update({ dataPath: e.target.value })}
          placeholder="Enter or select folder path"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          📁 This folder will be created automatically if it doesn't exist. Backups: <code className="bg-muted px-1 rounded">{state.dataPath.replace(/\\data$/, "\\backups")}</code>
        </p>
      </div>
    </div>
  );

  // ── Step 2: License Verification ────────────────────────────────────────────
  const handleVerifyLicense = async () => {
    if (!state.companyCode.trim() || !state.licenseKey.trim()) {
      toast({ title: "Required", description: "Please enter both Company Code and License Key", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost("license/verify", {
        companyCode: state.companyCode.trim().toUpperCase(),
        licenseKey: state.licenseKey.trim().toUpperCase(),
      });
      update({ licenseVerified: true, licenseInfo: data });
      toast({ title: "✓ License verified!", description: `Welcome, ${data.companyName}` });
    } catch (err: any) {
      toast({ title: "License verification failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderLicense = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Activate Your License</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your Company Code and License Key provided by Legacy Solutions.</p>
      </div>

      {state.licenseVerified && state.licenseInfo ? (
        <div className="p-4 rounded-xl border-2 border-green-500/50 bg-green-500/5 space-y-3">
          <div className="flex items-center gap-2 text-green-500 font-semibold">
            <CheckCircle className="w-5 h-5" />
            License Verified Successfully
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{state.licenseInfo.companyName}</span></div>
            <div><span className="text-muted-foreground">Plan:</span> <span className="font-medium capitalize">{state.licenseInfo.plan}</span></div>
            <div><span className="text-muted-foreground">Max Users:</span> <span className="font-medium">{state.licenseInfo.maxUsers}</span></div>
            <div><span className="text-muted-foreground">Max Devices:</span> <span className="font-medium">{state.licenseInfo.maxDevices}</span></div>
            <div><span className="text-muted-foreground">Max Branches:</span> <span className="font-medium">{state.licenseInfo.maxBranches}</span></div>
            {state.licenseInfo.subscriptionExpiry && (
              <div><span className="text-muted-foreground">Expires:</span> <span className="font-medium">{new Date(state.licenseInfo.subscriptionExpiry).toLocaleDateString()}</span></div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => update({ licenseVerified: false, licenseInfo: null })}>
            Use different code
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company Code</Label>
            <Input
              placeholder="e.g. DEMO01"
              value={state.companyCode}
              onChange={e => update({ companyCode: e.target.value.toUpperCase() })}
              className="font-mono"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">The unique code assigned to your company by Legacy Solutions.</p>
          </div>
          <div className="space-y-1.5">
            <Label>License Key</Label>
            <Input
              placeholder="e.g. LBE-XXXX-XXXX-XXXX-XXXX"
              value={state.licenseKey}
              onChange={e => update({ licenseKey: e.target.value.toUpperCase() })}
              className="font-mono"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">The license key from your purchase confirmation email.</p>
          </div>
          <Button onClick={handleVerifyLicense} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : <><Key className="w-4 h-4 mr-2" />Verify License</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don't have a license? Contact <a href="mailto:legacysolutions0001@gmail.com" className="underline">legacysolutions0001@gmail.com</a> or call <a href="tel:+917452888421" className="underline">+91 7452888421</a>
          </p>
        </div>
      )}
    </div>
  );

  // ── Step 3: Owner Account ────────────────────────────────────────────────────
  const handleActivate = async () => {
    if (!state.ownerUsername.trim() || !state.ownerPassword || !state.ownerPasswordConfirm) {
      toast({ title: "Required", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (state.ownerPassword !== state.ownerPasswordConfirm) {
      toast({ title: "Passwords don't match", description: "Re-enter matching passwords", variant: "destructive" });
      return;
    }
    if (state.ownerPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Get a device ID (browser fingerprint approximation)
      const deviceId = `${navigator.userAgent}-${screen.width}x${screen.height}`.replace(/[^a-zA-Z0-9-]/g, "_").substring(0, 128);

      await apiPost("license/activate", {
        companyCode: state.companyCode.toUpperCase(),
        licenseKey: state.licenseKey.toUpperCase(),
        ownerUsername: state.ownerUsername.trim().toLowerCase(),
        ownerPassword: state.ownerPassword,
        ownerName: state.ownerName.trim() || state.ownerUsername.trim(),
        dataPath: state.dataPath,
        deviceId,
        deviceName: navigator.platform || "Unknown",
        deviceOs: navigator.userAgent.includes("Windows") ? "Windows" : navigator.userAgent.includes("Mac") ? "macOS" : "Other",
      });

      // Save setup settings locally
      localStorage.setItem("lb_setup_settings", JSON.stringify({
        setupComplete: true, setupDate: new Date().toISOString(),
        dataPath: state.dataPath, companyCode: state.companyCode.toUpperCase(),
        companyName: state.licenseInfo?.companyName,
      }));

      toast({ title: "✓ Activation complete!", description: "Logging you in…" });

      // Auto-login the new owner
      const authData = await login(state.ownerUsername.trim().toLowerCase(), state.ownerPassword, state.companyCode.toUpperCase());
      setAuth(authData.user, authData.company);
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderOwnerAccount = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Create Your Owner Account</h2>
        <p className="text-muted-foreground text-sm mt-1">Set up the primary administrator account for {state.licenseInfo?.companyName || "your company"}.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Your Name</Label>
          <Input placeholder="e.g. Rajesh Kumar" value={state.ownerName} onChange={e => update({ ownerName: e.target.value })} disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input placeholder="e.g. rajesh" value={state.ownerUsername} onChange={e => update({ ownerUsername: e.target.value.toLowerCase() })} className="font-mono" disabled={loading} />
          <p className="text-xs text-muted-foreground">Employees will log in with: Company Code + Username + Password</p>
        </div>
        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" placeholder="Minimum 6 characters" value={state.ownerPassword} onChange={e => update({ ownerPassword: e.target.value })} disabled={loading} />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm Password</Label>
          <Input type="password" placeholder="Re-enter password" value={state.ownerPasswordConfirm} onChange={e => update({ ownerPasswordConfirm: e.target.value })} disabled={loading} />
        </div>
      </div>
      <Button onClick={handleActivate} disabled={loading} className="w-full">
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Activating…</> : <><User className="w-4 h-4 mr-2" />Activate & Go to Dashboard</>}
      </Button>
    </div>
  );

  // ── Step 0: Welcome ──────────────────────────────────────────────────────────
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <img src="/logo-erp.jpg" alt="Legacy Business ERP" className="h-20 w-auto rounded-xl shadow-lg object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Welcome to Legacy Business ERP</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Complete ERP solution by Legacy Solutions. Let's get you set up in just a few steps.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-sm">
        {[
          { icon: <HardDrive className="w-5 h-5" />, label: "Choose Storage" },
          { icon: <Key className="w-5 h-5" />, label: "Verify License" },
          { icon: <User className="w-5 h-5" />, label: "Create Account" },
          { icon: <Shield className="w-5 h-5" />, label: "Start Using" },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-lg border bg-muted/10 text-center flex flex-col items-center gap-2">
            <div className="text-primary">{item.icon}</div>
            <p className="text-muted-foreground text-xs">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Step 4: Complete ─────────────────────────────────────────────────────────
  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-green-600/20 flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Setup Complete!</h2>
        <p className="text-muted-foreground mt-2">Legacy Business ERP is activated and ready to use.</p>
      </div>
      <Button onClick={() => navigate("/login")} className="px-8">
        Go to Login <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

  const canProceed = () => {
    if (step === 1) return !!state.dataPath.trim();
    if (step === 2) return state.licenseVerified;
    return true;
  };

  const isLastInputStep = step === 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step ? "bg-green-600 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-muted mx-1" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-8">
            {step === 0 && renderWelcome()}
            {step === 1 && renderDataFolder()}
            {step === 2 && renderLicense()}
            {step === 3 && renderOwnerAccount()}
            {step === 4 && renderComplete()}

            {step < 4 && (
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0 || loading}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Back
                </Button>
                {!isLastInputStep && (
                  <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed() || loading}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
