import { ExternalLink, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
              Generate and manage E-Way Bills on the dedicated portal.
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => window.open("https://legacy-business-e-way-bill-generator.onrender.com", "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Click to make E Way Bill
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
