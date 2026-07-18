export function formatTZS(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(isNaN(n) ? 0 : n)
}

export function formatNumber(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount
  return new Intl.NumberFormat("en-US").format(isNaN(n) ? 0 : n)
}

export function maskPhone(phone: string) {
  if (phone.length < 6) return phone
  return phone.slice(0, 4) + "••••" + phone.slice(-3)
}

export const RISK_META: Record<
  "low" | "medium" | "high",
  { label: string; className: string }
> = {
  low: { label: "Low Risk", className: "bg-primary/10 text-primary border-primary/20" },
  medium: { label: "Medium Risk", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  high: { label: "High Risk", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export const LOAN_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary border-primary/20" },
  active: { label: "Active", className: "bg-primary/10 text-primary border-primary/20" },
  repaid: { label: "Repaid", className: "bg-muted text-muted-foreground border-border" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  defaulted: { label: "Defaulted", className: "bg-destructive/10 text-destructive border-destructive/20" },
}
