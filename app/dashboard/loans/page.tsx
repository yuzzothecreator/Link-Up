import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS, LOAN_STATUS_META } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoanApplicationForm } from "./loan-form"
import { AcceptOfferButton, WithdrawApplicationButton } from "./marketplace-actions"
import { Landmark } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Loans · Link-Up" }

export default async function LoansPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const [{ data: loans }, { data: productRows }, { data: applicationRows }] =
    await Promise.all([
      admin
        .from("loans")
        .select("*")
        .eq("borrower_id", session.userId)
        .order("created_at", { ascending: false }),
      admin
        .from("loan_products")
        .select(`
          id, name, min_amount, max_amount, min_term_days, max_term_days,
          base_interest_rate, required_trust_score,
          provider_organizations:organization_id (name, provider_type, status)
        `)
        .eq("status", "active")
        .order("created_at"),
      admin
        .from("loan_applications")
        .select(`
          id, amount, term_days, purpose, status, created_at,
          loan_products:product_id (name),
          provider_organizations:organization_id (name, provider_type),
          customer_consents:customer_consents (status, expires_at, scopes),
          lender_offers:lender_offers (
            id, amount, term_days, interest_rate, fees, total_repayment,
            conditions, status, expires_at
          )
        `)
        .eq("borrower_id", session.userId)
        .order("created_at", { ascending: false }),
    ])

  const products = (productRows ?? [])
    .filter((row) => {
      const provider = row.provider_organizations as unknown as { status: string } | null
      return provider?.status === "active"
    })
    .map((row) => {
      const provider = row.provider_organizations as unknown as {
        name: string
        provider_type: string
      }
      return {
        id: row.id,
        name: row.name,
        providerName: provider.name,
        providerType: provider.provider_type,
        minAmount: Number(row.min_amount),
        maxAmount: Number(row.max_amount),
        minTermDays: row.min_term_days,
        maxTermDays: row.max_term_days,
        baseInterestRate: Number(row.base_interest_rate),
        requiredTrustScore: row.required_trust_score,
      }
    })

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
          <p className="mt-1 text-sm text-muted-foreground">
            Compare products from banks, telecoms and microfinance providers.
          </p>
          <div className="mt-6">
            {products.length ? (
              <LoanApplicationForm products={products} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No provider products are available. Run migration 003 or ask an administrator to
                activate products.
              </p>
            )}
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Provider applications and offers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You control which provider can review your data and can withdraw before accepting an
          offer.
        </p>
        {!applicationRows?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">No provider applications yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {applicationRows.map((application) => {
              const provider = application.provider_organizations as unknown as {
                name: string
                provider_type: string
              }
              const product = application.loan_products as unknown as { name: string }
              const consents = (application.customer_consents ?? []) as Array<{
                status: string
                expires_at: string
                scopes: string[]
              }>
              const offers = (application.lender_offers ?? []) as Array<{
                id: string
                amount: number
                term_days: number
                interest_rate: number
                fees: number
                total_repayment: number
                conditions: string | null
                status: string
                expires_at: string
              }>
              const activeConsent = consents.find((consent) => consent.status === "granted")
              return (
                <div key={application.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{provider?.name ?? "Provider"}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {provider?.provider_type} · {product?.name}
                      </p>
                      <p className="mt-2 text-sm">
                        {formatTZS(application.amount)} for {application.term_days} days
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {application.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {activeConsent && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Access expires {new Date(activeConsent.expires_at).toLocaleDateString()} ·{" "}
                      {activeConsent.scopes.length} consent scopes
                    </p>
                  )}

                  {offers
                    .filter((offer) => offer.status === "pending")
                    .map((offer) => (
                      <div key={offer.id} className="mt-4 rounded-lg bg-primary/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              Offer: {formatTZS(offer.amount)} · {offer.interest_rate}% p.a.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total {formatTZS(offer.total_repayment)} · fees{" "}
                              {formatTZS(offer.fees)} · expires{" "}
                              {new Date(offer.expires_at).toLocaleDateString()}
                            </p>
                            {offer.conditions && (
                              <p className="mt-1 text-xs">{offer.conditions}</p>
                            )}
                          </div>
                          <AcceptOfferButton offerId={offer.id} />
                        </div>
                      </div>
                    ))}

                  {["submitted", "under_review", "offered"].includes(application.status) && (
                    <div className="mt-4">
                      <WithdrawApplicationButton applicationId={application.id} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
