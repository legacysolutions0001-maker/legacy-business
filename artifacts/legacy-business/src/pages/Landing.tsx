import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, BarChart3, Users, Zap, Shield, ArrowRight, Package } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="px-6 py-4 border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Legacy Business</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-sm font-medium">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="text-sm font-medium">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full border bg-background/50 text-sm font-medium mb-8">
              <span className="flex w-2 h-2 rounded-full bg-primary mr-2"></span>
              The Operating System for Modern Business
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 leading-tight">
              Command your company <br/>from <span className="text-muted-foreground">one place.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Legacy is the all-in-one platform for CRM, invoicing, HR, and project management. Stop switching tabs and start growing.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-base font-medium rounded-md group">
                  Start Building
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto mt-20 rounded-xl border bg-card/50 backdrop-blur-sm p-2 shadow-2xl relative">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur opacity-50" />
            <div className="rounded-lg overflow-hidden border bg-background relative z-10 aspect-video flex items-center justify-center">
              {/* Abstract dashboard placeholder */}
              <div className="w-full h-full p-8 flex flex-col gap-6 opacity-40">
                <div className="flex gap-4">
                  <div className="w-64 h-32 rounded bg-muted animate-pulse" />
                  <div className="w-64 h-32 rounded bg-muted animate-pulse delay-75" />
                  <div className="w-64 h-32 rounded bg-muted animate-pulse delay-150" />
                </div>
                <div className="flex-1 flex gap-4">
                  <div className="flex-1 rounded bg-muted animate-pulse delay-200" />
                  <div className="w-80 rounded bg-muted animate-pulse delay-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 border-t bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to run your business</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">One dense, unified interface replacing dozens of disjointed tools.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Users, title: "CRM & Sales", desc: "Track leads, manage pipelines, and close deals faster with our dense Kanban views." },
                { icon: BarChart3, title: "Finance", desc: "Create invoices, track expenses, and monitor your cash flow in real-time." },
                { icon: Briefcase, title: "HR & Team", desc: "Manage employees, track leave requests, and maintain the company directory." },
                { icon: Package, title: "Inventory", desc: "Real-time stock tracking with automated low-stock alerts and valuation." },
                { icon: Zap, title: "Projects", desc: "Kanban boards for tasks, budget tracking, and team assignment." },
                { icon: Shield, title: "Enterprise Grade", desc: "Secure authentication, role-based access, and complete data isolation." },
              ].map((feature, i) => (
                <div key={i} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="w-4 h-4" />
            <span className="font-medium text-sm">Legacy Business</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Legacy Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
