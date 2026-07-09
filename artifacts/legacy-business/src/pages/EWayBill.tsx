import { FileText, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function EWayBill() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">E-Way Bills</h1>
        <p className="text-muted-foreground text-sm">Electronic waybills for goods movement (GST compliance)</p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="flex flex-col items-center gap-6 py-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">E-Way Bill Generator</h2>
            <p className="text-muted-foreground text-sm">
              E-Way Bill generation runs locally. Visit the government portal at{" "}
              <a
                href="https://ewaybillgst.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                ewaybillgst.gov.in
              </a>{" "}
              to register and generate bills using your GSTIN.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground max-w-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>No external cloud service is used. All your data stays on your local server.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
