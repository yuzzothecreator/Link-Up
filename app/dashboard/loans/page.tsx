import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS, LOAN_STATUS_META } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoanApplicationForm } from "./loan-form"
import { Landmark } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Loans · trustLink" }

export default async function LoansPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: loans } = await admin
    .from("loans")
    .select("*")
    .eq("borrower_id", session.userId)
    .order("created_at", { ascending: false })

  const allLoans = loans ?? []
  const activeLoans = allLoans.filter((l) => l.status === "active")
  const pastLoans = allLoans.filter((l) => l.status !== "active")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        <p className="mt-1 text-sm text-muted-foreground">Apply for new loans and manage existing ones.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Apply for Loan */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">Apply for a Loan</h2>
          <p className="mt-1 text-sm text-muted-foreground">Interest rates depend on your Trust Score.</p>
          <div className="mt-6">
            <LoanApplicationForm />
          </div>
        </div>

        {/* Active Loan / Status */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground">Active Loans</h2>
            {activeLoans.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Landmark}
                  title="No active loans"
                  description="You don't have any outstanding loans."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {activeLoans.map((loan) => {
                  const remaining = loan.total_repayment - loan.amount_repaid
                  const progress = (loan.amount_repaid / loan.total_repayment) * 100
                  return (
                    <div key={loan.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{formatTZS(loan.amount)}</span>
                        <Badge className={LOAN_STATUS_META[loan.status]?.className}>
                          {LOAN_STATUS_META[loan.status]?.label ?? loan.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{loan.purpose}</p>

                      <div className="mt-4 space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span>Repaid: {formatTZS(loan.amount_repaid)}</span>
                          <span>Remaining: {formatTZS(remaining)}</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="absolute left-0 top-0 h-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground">Loan History</h2>
            {pastLoans.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No past loans.</p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {pastLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">{formatTZS(loan.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(loan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={LOAN_STATUS_META[loan.status]?.className}>
                      {LOAN_STATUS_META[loan.status]?.label ?? loan.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
