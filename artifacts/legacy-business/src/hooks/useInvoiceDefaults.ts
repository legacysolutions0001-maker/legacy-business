const KEY = "legacy_invoice_defaults";

export type InvoiceDefaults = {
  gst: string;
  discount: string;
  paymentTerms: string;
  notes: string;
};

const FALLBACK: InvoiceDefaults = {
  gst: "18",
  discount: "0",
  paymentTerms: "30",
  notes: "",
};

export function getInvoiceDefaults(): InvoiceDefaults {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FALLBACK };
    return { ...FALLBACK, ...JSON.parse(raw) };
  } catch {
    return { ...FALLBACK };
  }
}

export function saveInvoiceDefaults(d: Partial<InvoiceDefaults>): void {
  const current = getInvoiceDefaults();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...d }));
}
