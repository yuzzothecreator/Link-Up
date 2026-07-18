import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Transactions · Link-Up" }

export default async function TransactionsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: transactions } = await admin
    .from("transactions")
    .select("id, type, amount, status, description, reference, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })

  const txns = transactions ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">View your complete transaction history.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {txns.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Your deposits, withdrawals, and loan disbursements will appear here."
          />
        ) : (
          <div className="divide-y divide-border">
            {txns.map((tx) => (
              <div key={tx.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      tx.type === "deposit" || tx.type === "loan_disbursement"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {tx.type === "deposit" || tx.type === "loan_disbursement" ? (
                      <ArrowDownLeft className="h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground capitalize">
                      {tx.type.replace("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tx.description ?? "—"}
                    </p>
                    {tx.reference && (
                      <p className="mt-0.5 text-xs text-muted-foreground/70 font-mono">
                        Ref: {tx.reference}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-end justify-between sm:flex-col sm:items-end">
                  <p
                    className={`font-semibold ${
                      tx.type === "deposit" || tx.type === "loan_disbursement"
                        ? "text-emerald-600"
                        : "text-foreground"
                    }`}
                  >
                    {tx.type === "deposit" || tx.type === "loan_disbursement" ? "+" : "-"}
                    {formatTZS(tx.amount)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-TZ", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
