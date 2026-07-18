import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS, LOAN_STATUS_META, maskPhone } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { LoanActionButtons } from "./loan-actions"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Loans · Admin" }

export default async function AdminLoansPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const { data: loans } = await admin
    .from("loans")
    .select(`
      *,
      profiles:borrower_id (
        full_name,
        phone,
        trust_scores(score)
      )
    `)
    .order("created_at", { ascending: false })

  const allLoans = loans ?? []
  const pendingLoans = allLoans.filter((l) => l.status === "pending")
  const otherLoans = allLoans.filter((l) => l.status !== "pending")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loans Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review pending applications and monitor active loans.</p>
      </div>

      {/* Pending Applications */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Pending Applications ({pendingLoans.length})</h2>
        {pendingLoans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground text-sm shadow-sm">
            No pending loan applications.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingLoans.map((loan: any) => {
              const profile = loan.profiles
              const score = profile?.trust_scores?.[0]?.score ?? 0
              return (
                <div key={loan.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{formatTZS(loan.amount)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{loan.term_days} days @ {loan.interest_rate}%</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">{maskPhone(profile?.phone)}</p>
                      <p className="text-xs font-semibold">Score: <span className={score >= 700 ? "text-emerald-600" : score >= 400 ? "text-amber-600" : "text-red-600"}>{score}</span></p>
                    </div>
                  </div>

                  <div className="mt-3 bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Purpose</p>
                    <p className="text-xs text-foreground line-clamp-2">{loan.purpose}</p>
                  </div>

                  <div className="mt-5">
                    <LoanActionButtons loanId={loan.id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active & Past Loans */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All Loans</h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Borrower</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Repaid</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {otherLoans.map((loan: any) => (
                  <tr key={loan.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{loan.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{maskPhone(loan.profiles?.phone)}</p>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatTZS(loan.amount)}</td>
                    <td className="px-6 py-4">
                      {formatTZS(loan.amount_repaid)}
                      <p className="text-[10px] text-muted-foreground">of {formatTZS(loan.total_repayment)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={LOAN_STATUS_META[loan.status]?.className}>
                        {LOAN_STATUS_META[loan.status]?.label ?? loan.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(loan.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
