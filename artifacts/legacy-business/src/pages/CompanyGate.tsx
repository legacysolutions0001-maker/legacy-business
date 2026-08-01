import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  ArrowRight,
  Building2,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  Crown,
} from "lucide-react";

const SUPER_CODE = "SUPER";

type Mode = "enter-code" | "register" | "registered";

interface Props {
  onCodeValidated: (code: string, companyName: string) => void;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CompanyGate({ onCodeValidated }: Props) {
  const [mode, setMode] = useState<Mode>("enter-code");

  /* ── enter-code state ── */
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  /* ── register state ── */
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  /* ── registered state ── */
  const [newCode, setNewCode] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [copied, setCopied] = useState(false);

  /* ─────────────────────── handlers ─────────────────────── */

  async function handleContinue() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setCodeError("Please enter your company code.");
      return;
    }

    /* super admin master code → go to company registration */
    if (trimmed === SUPER_CODE) {
      setCodeError("");
      setMode("register");
      return;
    }

    /* regular company code → validate against DB */
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch(
        `${BASE}/api/companies/validate/${encodeURIComponent(trimmed)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { name: string };
        onCodeValidated(trimmed, data.name);
      } else {
        setCodeError("Invalid company code. Check with your administrator.");
      }
    } catch {
      setCodeError("Network error. Please try again.");
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleRegister() {
    if (!regName.trim()) {
      setRegError("Company name is required.");
      return;
    }
    setRegLoading(true);
    setRegError("");
    try {
      const res = await fetch(`${BASE}/api/companies/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          adminEmail: regEmail.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { code: string; name: string };
        setNewCode(data.code);
        setNewCompanyName(data.name);
        sessionStorage.setItem("lb_company_code", data.code);
        sessionStorage.setItem("lb_company_name", data.name);
        setMode("registered");
      } else {
        const err = (await res.json()) as { error?: string };
        setRegError(err.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setRegError("Network error. Please try again.");
    } finally {
      setRegLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(newCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  /* ─────────────────────── render ─────────────────────── */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── header ── */}
      <header className="px-6 py-4 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Legacy Business</span>
        </div>
        <Badge variant="secondary" className="text-xs font-medium gap-1">
          <ShieldCheck className="w-3 h-3" />
          Enterprise ERP
        </Badge>
      </header>

      {/* ── main ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* ════ ENTER CODE ════ */}
          {mode === "enter-code" && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-2">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome to Legacy</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter your company code to access your workspace.
                </p>
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-6 pb-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="company-code" className="font-medium text-sm">
                      Company Code
                    </Label>
                    <Input
                      id="company-code"
                      value={code}
                      onChange={(e) => {
                        setCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 6),
                        );
                        setCodeError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                      placeholder="XXXXXX"
                      className="h-13 text-center text-2xl font-mono tracking-[0.55em] uppercase placeholder:text-muted-foreground/40 placeholder:tracking-widest"
                      maxLength={6}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {codeError && (
                      <div className="flex items-center gap-1.5 text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {codeError}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-11 font-semibold text-sm"
                    onClick={handleContinue}
                    disabled={codeLoading || code.length < 5}
                  >
                    {codeLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <p className="text-center text-xs text-muted-foreground">
                Super admins — use your admin code to register a new company.
              </p>
            </>
          )}

          {/* ════ REGISTER COMPANY (super admin) ════ */}
          {mode === "register" && (
            <>
              <button
                onClick={() => {
                  setMode("enter-code");
                  setCode("");
                  setRegError("");
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center space-y-2">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-amber-500/10 items-center justify-center mb-2">
                  <Crown className="w-8 h-8 text-amber-500" />
                </div>
                <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5 text-xs font-semibold tracking-wide mb-1">
                  SUPER ADMIN
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight">Register Your Company</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Set up your workspace. You'll get a unique company code to share with your team.
                </p>
              </div>

              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="font-medium text-sm">
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reg-name"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setRegError("");
                      }}
                      placeholder="Acme Pvt Ltd"
                      className="h-11"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="font-medium text-sm">
                      Admin Email{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setRegError("");
                      }}
                      placeholder="admin@acme.com"
                      className="h-11"
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    />
                  </div>

                  {regError && (
                    <div className="flex items-center gap-1.5 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {regError}
                    </div>
                  )}

                  <Button
                    className="w-full h-11 font-semibold text-sm"
                    onClick={handleRegister}
                    disabled={regLoading || !regName.trim()}
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating company…
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4 mr-2" />
                        Create Company
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* ════ REGISTERED — show the generated code ════ */}
          {mode === "registered" && (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-green-500/10 items-center justify-center mb-2">
                  <CheckCircle2 className="w-9 h-9 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Company Created!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{newCompanyName}</span>{" "}
                  is ready. Share this code with your team so they can log in.
                </p>
              </div>

              {/* Code card */}
              <Card className="border-2 border-primary/25 bg-primary/5 shadow-sm">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="space-y-1 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Your Company Code
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Share this with team members to give them access
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background rounded-xl border px-4 py-4 text-center">
                      <span className="text-4xl font-mono font-black tracking-[0.35em] text-primary select-all">
                        {newCode}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-16 w-14 flex-shrink-0 rounded-xl"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </Button>
                  </div>

                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                      ⚠️ Save this code now — anyone with it can join your workspace.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full h-12 text-base font-semibold group"
                onClick={() => onCodeValidated(newCode, newCompanyName)}
              >
                Create Admin Account
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                You'll create your admin account next. The company code is already saved.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── footer ── */}
      <footer className="border-t py-5 px-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Legacy Business · Enterprise ERP Platform
        </p>
      </footer>
    </div>
  );
}
