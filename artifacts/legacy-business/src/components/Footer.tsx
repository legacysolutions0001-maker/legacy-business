export default function Footer({ dark = false }: { dark?: boolean }) {
  const base = dark
    ? "border-slate-800 text-slate-500"
    : "border-border text-muted-foreground";

  return (
    <footer className={`border-t ${base} text-[10px] leading-relaxed px-4 py-3 mt-auto`}>
      <div className="max-w-7xl mx-auto space-y-1">
        <p className="font-semibold">
          Legacy Solutions Pvt. Ltd. &nbsp;|&nbsp; +91 74528 88421 &nbsp;|&nbsp; Bazpur, Uttarakhand, India
        </p>
        <p>
          <span className="font-medium">License &amp; Intellectual Property:</span> The software, source code, design,
          branding, dashboards, workflows, and all related intellectual property remain the exclusive property of the
          developer. The client / company is granted only a limited usage license for internal business use. The client
          may not copy, resell, redistribute, reverse engineer, modify for resale, sublicense, or transfer the software
          to any third party without written permission from the developer. Unauthorized duplication or commercial
          redistribution of the platform is strictly prohibited.
        </p>
        <p>
          © 2026 Legacy Solutions Pvt. Ltd. All rights reserved. Built and maintained by Legacy Solutions Pvt. Ltd.
          &nbsp;|&nbsp; Powered by <strong>Legacy Business</strong> — Elite Business Management Platform
        </p>
      </div>
    </footer>
  );
}
