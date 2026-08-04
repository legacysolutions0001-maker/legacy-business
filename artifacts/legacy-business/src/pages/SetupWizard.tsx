import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Database, HardDrive, Usb, Cloud, Network, ChevronRight,
  ChevronLeft, CheckCircle, Loader2, FolderOpen, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type StorageOption = "local" | "external" | "usb" | "onedrive" | "network" | "custom";

interface WizardState {
  storageType: StorageOption;
  customPath: string;
  databaseUrl: string;
  adminPassword: string;
  companyName: string;
  done: boolean;
}

// ─── Storage options ──────────────────────────────────────────────────────────
const STORAGE_OPTIONS: { id: StorageOption; label: string; description: string; icon: React.ReactNode; badge?: string }[] = [
  {
    id: "local",
    label: "C: Drive (Local)",
    description: "Store on the main drive. Fast and reliable. Recommended for desktop setups.",
    icon: <HardDrive className="w-6 h-6" />,
    badge: "Recommended",
  },
  {
    id: "external",
    label: "D: Drive / External HDD",
    description: "Store on a secondary or external hard drive. Good for separating data from the OS.",
    icon: <HardDrive className="w-6 h-6" />,
  },
  {
    id: "usb",
    label: "USB Pen Drive",
    description: "Portable storage. Keep the pen drive plugged in while the app is running.",
    icon: <Usb className="w-6 h-6" />,
  },
  {
    id: "onedrive",
    label: "OneDrive Folder",
    description: "Automatically syncs to Microsoft cloud. Best for data safety.",
    icon: <Cloud className="w-6 h-6" />,
  },
  {
    id: "network",
    label: "Network / Shared Folder",
    description: "Store on a shared company server or NAS device. For multi-computer setups.",
    icon: <Network className="w-6 h-6" />,
  },
  {
    id: "custom",
    label: "Custom Folder",
    description: "Specify any folder path on this computer or network.",
    icon: <FolderOpen className="w-6 h-6" />,
  },
];

// ─── Default paths by storage type ───────────────────────────────────────────
const DEFAULT_PATHS: Record<StorageOption, string> = {
  local:    "C:\\LegacyBusinessERP\\data",
  external: "D:\\LegacyBusinessERP\\data",
  usb:      "E:\\LegacyBusinessERP\\data",
  onedrive: "%USERPROFILE%\\OneDrive\\LegacyBusinessERP\\data",
  network:  "\\\\server\\shared\\LegacyBusinessERP\\data",
  custom:   "",
};

const STEPS = ["Welcome", "Database Location", "Configuration", "Complete"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SetupWizard() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<WizardState>({
    storageType: "local",
    customPath: DEFAULT_PATHS["local"],
    databaseUrl: "",
    adminPassword: "",
    companyName: "",
    done: false,
  });

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  const selectStorage = (id: StorageOption) => {
    update({ storageType: id, customPath: DEFAULT_PATHS[id] });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save wizard settings to localStorage
      const settings = {
        storageType: state.storageType,
        dataPath: state.customPath,
        backupPath: state.customPath.replace("data", "backups"),
        setupComplete: true,
        setupDate: new Date().toISOString(),
        companyName: state.companyName,
      };
      localStorage.setItem("lb_setup_settings", JSON.stringify(settings));
      localStorage.setItem("lb_backup_location", state.customPath.replace("data", "backups"));

      // Small delay to show loading state
      await new Promise(r => setTimeout(r, 1200));
      update({ done: true });
    } finally {
      setSaving(false);
    }
  };

  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
        <Database className="w-10 h-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Welcome to Legacy Business ERP</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Let's set up your database and configure where your business data will be stored.
          This only takes a minute.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-sm">
        {[
          { icon: "🗄️", label: "Choose Storage Location" },
          { icon: "⚙️", label: "Configure Settings" },
          { icon: "🚀", label: "Start Using ERP" },
        ].map(item => (
          <div key={item.label} className="p-3 rounded-lg border bg-muted/10 text-center">
            <div className="text-2xl mb-1">{item.icon}</div>
            <p className="text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Step 1: Database Location ────────────────────────────────────────────
  const renderLocation = () => (
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
              "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
              state.storageType === opt.id
                ? "border-primary bg-primary/5"
                : "border-muted/50 hover:border-muted hover:bg-muted/10"
            )}
            onClick={() => selectStorage(opt.id)}
          >
            {opt.badge && (
              <Badge className="absolute -top-2 right-3 text-xs bg-green-600">{opt.badge}</Badge>
            )}
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 shrink-0", state.storageType === opt.id ? "text-primary" : "text-muted-foreground")}>
                {opt.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
              {state.storageType === opt.id && (
                <CheckCircle className="w-4 h-4 text-primary shrink-0 ml-auto mt-0.5" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Path display / edit */}
      <div className="space-y-2">
        <Label>Data Folder Path</Label>
        <div className="flex gap-2">
          <Input
            value={state.customPath}
            onChange={e => update({ customPath: e.target.value })}
            placeholder="Enter or select folder path"
            className="font-mono text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          📁 This folder will be created automatically if it doesn't exist.
          Backup files will be stored in: <code className="bg-muted px-1 rounded">{state.customPath.replace(/\\data$/, "\\backups")}</code>
        </p>
      </div>
    </div>
  );

  // ── Step 2: Configuration ────────────────────────────────────────────────
  const renderConfig = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Basic Configuration</h2>
        <p className="text-muted-foreground text-sm mt-1">Set up your company name and admin credentials.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Company Name</Label>
          <Input
            placeholder="e.g. Bhullar Enterprises Pvt. Ltd."
            value={state.companyName}
            onChange={e => update({ companyName: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">This can be changed later in Settings.</p>
        </div>

        <div className="p-4 rounded-lg border bg-muted/5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="w-4 h-4" />Default Admin Credentials
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Super Admin Username</p>
              <code className="bg-muted px-2 py-1 rounded text-xs block">bhullar01</code>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Default Password</p>
              <code className="bg-muted px-2 py-1 rounded text-xs block">Bhullar_01</code>
            </div>
          </div>
          <p className="text-xs text-amber-500">⚠️ Change the password after first login for security.</p>
        </div>

        <div className="space-y-2">
          <Label>Database Connection (Advanced)</Label>
          <Input
            placeholder="postgresql://user:password@localhost:5432/legacy_business"
            value={state.databaseUrl}
            onChange={e => update({ databaseUrl: e.target.value })}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">Leave blank to use the default managed database.</p>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Complete ─────────────────────────────────────────────────────
  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-green-600/20 flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Setup Complete!</h2>
        <p className="text-muted-foreground mt-2">
          Legacy Business ERP is configured and ready to use.
        </p>
      </div>
      <div className="text-left space-y-2 max-w-sm mx-auto">
        {[
          { label: "Storage Type", value: STORAGE_OPTIONS.find(o => o.id === state.storageType)?.label },
          { label: "Data Path", value: state.customPath || "Default" },
          { label: "Company Name", value: state.companyName || "Not set (configure in Settings)" },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-right max-w-48 truncate" title={item.value}>{item.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => navigate("/login")} className="px-8">
          Go to Login <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <Button variant="outline" onClick={() => navigate("/super")}>
          Super Admin
        </Button>
      </div>
    </div>
  );

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step ? "bg-green-600 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn("text-sm hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-muted mx-1" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-8">
            {state.done ? renderComplete() : (
              <>
                {step === 0 && renderWelcome()}
                {step === 1 && renderLocation()}
                {step === 2 && renderConfig()}

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                    <ChevronLeft className="w-4 h-4 mr-1" />Back
                  </Button>
                  {step < 2 ? (
                    <Button onClick={() => setStep(s => s + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleFinish} disabled={saving}>
                      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <>Finish Setup <ChevronRight className="w-4 h-4 ml-1" /></>}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
