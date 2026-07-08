import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { getInvoiceDefaults, saveInvoiceDefaults, type InvoiceDefaults } from "@/hooks/useInvoiceDefaults";
import { CheckCircle, Building2, User, Bell, Palette, Shield, LogOut, FileText, Info } from "lucide-react";

const COMPANY_KEY = "legacy_company_settings";

function getCompanyDefaults() {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export default function Settings() {
  const { user, isLoading: isLoaded, logout: signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [company, setCompany] = useState(() => ({
    name: "Legacy Business",
    website: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    gstNumber: "",
    pan: "",
    currency: "INR",
    fiscalYear: "april",
    ...getCompanyDefaults(),
  }));

  const [invoiceDefaults, setInvoiceDefaults] = useState<InvoiceDefaults>(() => getInvoiceDefaults());

  const [notifications, setNotifications] = useState({
    invoicePaid: true,
    overdueInvoices: true,
    lowStock: true,
    leaveRequests: true,
    newLeads: false,
  });

  type CompanyState = typeof company;
  const setC = (k: keyof CompanyState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCompany((f: CompanyState) => ({ ...f, [k]: e.target.value }));

  const setID = (k: keyof InvoiceDefaults) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInvoiceDefaults(f => ({ ...f, [k]: e.target.value }));

  function saveCompany() {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    toast({ title: "Company settings saved", description: "These details will appear on your invoices." });
  }

  function saveInvoiceDefs() {
    saveInvoiceDefaults(invoiceDefaults);
    toast({
      title: "Invoice defaults saved",
      description: `GST ${invoiceDefaults.gst}% and Discount ${invoiceDefaults.discount}% will pre-fill on new invoices.`,
    });
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, company, and invoice preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="invoicing" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Invoicing</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Appearance</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Security</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information linked to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-2xl font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-lg">{user?.name || "—"}</div>
                  <div className="text-muted-foreground text-sm">{user?.email}</div>
                  <Badge variant="secondary" className="mt-2 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {"Verified"}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={user?.name?.split(" ")[0] || ""} disabled className="bg-muted/40" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={user?.name?.split(" ").slice(1).join(" ") || ""} disabled className="bg-muted/40" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input defaultValue={user?.email || ""} disabled className="bg-muted/40" />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> Profile details are managed through your identity provider.
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div>
                  <div className="font-medium text-sm">Sign Out</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Sign out of your account on this device</div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Company ── */}
        <TabsContent value="company">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Details that appear on invoices, reports, and receipts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={company.name} onChange={setC("name")} placeholder="Your company name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={company.website} onChange={setC("website")} placeholder="https://example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={company.country} onChange={setC("country")} placeholder="India" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input value={company.address} onChange={setC("address")} placeholder="123 Business Park, Andheri" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={company.city} onChange={setC("city")} placeholder="Mumbai" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={company.state} onChange={setC("state")} placeholder="Maharashtra" />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input value={company.postalCode} onChange={setC("postalCode")} placeholder="400001" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input value={company.gstNumber} onChange={setC("gstNumber")} placeholder="22AAAAA0000A1Z5" className="font-mono uppercase" />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input value={company.pan} onChange={setC("pan")} placeholder="AAAAA9999A" className="font-mono uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={company.currency} onValueChange={v => setCompany((f: CompanyState) => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                        <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                        <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year Start</Label>
                    <Select value={company.fiscalYear} onValueChange={v => setCompany((f: CompanyState) => ({ ...f, fiscalYear: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="april">April (India — FY Apr–Mar)</SelectItem>
                        <SelectItem value="january">January (CY Jan–Dec)</SelectItem>
                        <SelectItem value="july">July (Jul–Jun)</SelectItem>
                        <SelectItem value="october">October (Oct–Sep)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={saveCompany} className="min-w-[160px]">Save Company Details</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Invoicing Defaults ── */}
        <TabsContent value="invoicing">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Invoice Defaults
                </CardTitle>
                <CardDescription>
                  These values auto-fill every time you create a new invoice — saving you time on repetitive entries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* GST */}
                <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs">GST</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Default GST Rate</div>
                      <div className="text-xs text-muted-foreground">Applied automatically on new invoices</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["0", "5", "12", "18", "28"].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setInvoiceDefaults(f => ({ ...f, gst: pct }))}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                          invoiceDefaults.gst === pct
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <span>{pct === "0" ? "Exempt / 0%" : `${pct}%`}</span>
                        {pct === "18" && <Badge variant="secondary" className="text-[10px]">Common</Badge>}
                        {invoiceDefaults.gst === pct && <CheckCircle className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-background">
                      <span className="text-sm text-muted-foreground shrink-0">Custom:</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={invoiceDefaults.gst}
                        onChange={setID("gst")}
                        className="h-7 border-0 shadow-none focus-visible:ring-0 text-sm font-medium p-0 w-16"
                        placeholder="e.g. 15"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                {/* Discount */}
                <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-[10px]">DISC</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Default Discount Rate</div>
                      <div className="text-xs text-muted-foreground">Pre-filled discount percentage on new invoices</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {["0", "5", "10", "15"].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setInvoiceDefaults(f => ({ ...f, discount: pct }))}
                        className={`flex items-center justify-center py-3 rounded-lg border text-sm font-medium transition-all ${
                          invoiceDefaults.discount === pct
                            ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 ring-1 ring-emerald-500/30"
                            : "border-border bg-background hover:border-emerald-400/40"
                        }`}
                      >
                        {pct === "0" ? "None" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground shrink-0">Custom %:</Label>
                    <div className="relative w-32">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={invoiceDefaults.discount}
                        onChange={setID("discount")}
                        className="pr-8"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                {/* Payment Terms & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      Payment Terms
                      <span className="text-xs text-muted-foreground font-normal">(days)</span>
                    </Label>
                    <div className="flex gap-2">
                      {["7", "15", "30", "60"].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setInvoiceDefaults(f => ({ ...f, paymentTerms: d }))}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                            invoiceDefaults.paymentTerms === d
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Custom days"
                      value={invoiceDefaults.paymentTerms}
                      onChange={setID("paymentTerms")}
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Invoice Notes</Label>
                    <Input
                      placeholder="e.g. Thank you for your business!"
                      value={invoiceDefaults.notes}
                      onChange={setID("notes")}
                    />
                    <p className="text-xs text-muted-foreground">Appears at the bottom of every new invoice.</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-dashed bg-muted/10 p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview — How it will look</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>₹10,000.00</span>
                    </div>
                    {parseFloat(invoiceDefaults.discount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({invoiceDefaults.discount}%)</span>
                        <span>−₹{(10000 * parseFloat(invoiceDefaults.discount) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(invoiceDefaults.discount) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>After Discount</span>
                        <span>₹{(10000 - 10000 * parseFloat(invoiceDefaults.discount) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {parseFloat(invoiceDefaults.gst) > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>GST ({invoiceDefaults.gst}%)</span>
                        <span>+₹{((10000 - 10000 * parseFloat(invoiceDefaults.discount || "0") / 100) * parseFloat(invoiceDefaults.gst) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                      <span>Total</span>
                      <span>₹{(() => {
                        const sub = 10000;
                        const disc = sub * parseFloat(invoiceDefaults.discount || "0") / 100;
                        const afterDisc = sub - disc;
                        const gstAmt = afterDisc * parseFloat(invoiceDefaults.gst || "0") / 100;
                        return (afterDisc + gstAmt).toFixed(2);
                      })()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveInvoiceDefs} className="min-w-[200px] gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Save as Invoice Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how Legacy Business looks for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Color Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "light", label: "Light Mode", preview: "bg-white", text: "text-zinc-800" },
                    { id: "dark", label: "Dark Mode", preview: "bg-zinc-900", text: "text-zinc-100" },
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setTheme(opt.id as "light" | "dark")}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                        theme === opt.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`${opt.preview} h-24 flex flex-col items-center justify-center gap-1.5 border-b border-border/20`}>
                        <div className={`${opt.text} font-semibold text-sm`}>{opt.label}</div>
                        <div className="flex gap-1">
                          {["bg-zinc-300", "bg-zinc-400", "bg-zinc-500"].map(c => (
                            <div key={c} className={`w-6 h-1.5 rounded-full ${opt.id === "dark" ? c.replace("zinc-3", "zinc-6").replace("zinc-4", "zinc-5").replace("zinc-5", "zinc-4") : c}`} />
                          ))}
                        </div>
                      </div>
                      <div className={`px-3 py-2 flex items-center justify-between ${opt.preview}`}>
                        <span className={`text-xs ${opt.text} opacity-70`}>Preview</span>
                        {theme === opt.id && <CheckCircle className="w-4 h-4 text-primary" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              {[
                { key: "invoicePaid", label: "Invoice Paid", desc: "When a customer marks an invoice as paid" },
                { key: "overdueInvoices", label: "Overdue Invoices", desc: "Daily digest of overdue invoices" },
                { key: "lowStock", label: "Low Stock Alerts", desc: "When a product falls below minimum stock threshold" },
                { key: "leaveRequests", label: "Leave Requests", desc: "When an employee submits a leave request" },
                { key: "newLeads", label: "New Leads", desc: "When a new lead is added to the pipeline" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                  <Switch
                    checked={notifications[key as keyof typeof notifications]}
                    onCheckedChange={v => setNotifications(f => ({ ...f, [key]: v }))}
                  />
                </div>
              ))}
              <div className="pt-4">
                <Button onClick={() => toast({ title: "Notification preferences saved" })}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div>
                  <div className="font-medium text-sm">Authentication Provider</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Your account is secured with Clerk</div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                <div>
                  <div className="font-medium text-sm">Account Email</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
                </div>
                <Badge variant="secondary">
                  {"Verified"}
                </Badge>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                Password changes, two-factor authentication, and other security settings are managed through your identity provider.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
