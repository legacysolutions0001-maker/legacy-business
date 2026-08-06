import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, LogIn, UserPlus } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo / Branding */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
          <Briefcase className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Legacy Business</h1>
        <p className="text-slate-400 mt-2 text-lg">ERP Management System</p>
        <p className="text-slate-500 mt-1 text-sm">by Legacy Solutions</p>
      </div>

      {/* Two buttons only */}
      <div className="w-full max-w-xs flex flex-col gap-4">
        <Link href="/login">
          <Button className="w-full h-14 text-base font-semibold rounded-xl gap-3 shadow-lg">
            <LogIn className="w-5 h-5" />
            Login
          </Button>
        </Link>

        <Link href="/setup">
          <Button
            variant="outline"
            className="w-full h-14 text-base font-semibold rounded-xl gap-3 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <UserPlus className="w-5 h-5" />
            Registration
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-slate-600">
        © {new Date().getFullYear()} Legacy Solutions. All rights reserved.
      </p>
    </div>
  );
}
