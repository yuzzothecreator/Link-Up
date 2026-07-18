import { notFound } from "next/navigation"
import { buildUnderwritingDisclosure } from "@/lib/marketplace/disclosure"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTZS } from "@/lib/format"
import { DecisionPanel } from "./decision-panel"

export default async function LenderApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let disclosure
  try {
    disclosure = await buildUnderwritingDisclosure(id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Application review</h1>
          <Badge variant="outline" className="capitalize">
            {disclosure.application.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Disclosure is consent-scoped. This access has been recorded in the audit log.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-semibold">{formatTZS(disclosure.application.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Term</p>
                <p className="font-semibold">{disclosure.application.termDays} days</p>
              </div>
              <div className="sm:col-span-3">
                <p className="text-xs text-muted-foreground">Purpose</p>
                <p className="mt-1 text-sm">{disclosure.application.purpose}</p>
              </div>
            </CardContent>
          </Card>

          {disclosure.identity && (
            <Card>
              <CardHeader>
                <CardTitle>Verified identity summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Applicant</p>
                  <p className="font-medium">{disclosure.identity.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Region</p>
                  <p className="font-medium">{disclosure.identity.region ?? "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone verification</p>
                  <Badge variant="secondary">
                    {disclosure.identity.phoneVerified ? "verified" : "not verified"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NIDA verification</p>
                  <Badge variant="secondary">{disclosure.identity.nidaStatus}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {disclosure.business && (
            <Card>
              <CardHeader>
                <CardTitle>Business profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <p><span className="text-muted-foreground">Name:</span> {disclosure.business.name}</p>
                <p><span className="text-muted-foreground">Type:</span> {disclosure.business.type}</p>
                <p><span className="text-muted-foreground">Location:</span> {disclosure.business.location}</p>
                <p>
                  <span className="text-muted-foreground">Declared daily income:</span>{" "}
                  {formatTZS(disclosure.business.declaredDailyIncome)}
                </p>
              </CardContent>
            </Card>
          )}

          {disclosure.cashflow && (
            <Card>
              <CardHeader>
                <CardTitle>Consented bank / mobile-money cash flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Rows</p><p className="font-semibold">{disclosure.cashflow.transactionCount}</p></div>
                  <div><p className="text-xs text-muted-foreground">Income</p><p className="font-semibold text-emerald-600">{formatTZS(disclosure.cashflow.totalIncome)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Expenses</p><p className="font-semibold text-red-600">{formatTZS(disclosure.cashflow.totalExpenses)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold">{formatTZS(disclosure.cashflow.netCashflow)}</p></div>
                </div>
                {disclosure.cashflow.transactions && (
                  <div className="mt-5 max-h-80 divide-y overflow-auto rounded-lg border">
                    {disclosure.cashflow.transactions.map((row, index) => (
                      <div key={`${row.date}-${index}`} className="flex justify-between gap-4 p-3 text-sm">
                        <div>
                          <p>{row.description ?? "Transaction"}</p>
                          <p className="text-xs text-muted-foreground">{row.date}</p>
                        </div>
                        <p className={row.type === "income" ? "text-emerald-600" : "text-red-600"}>
                          {row.type === "expense" ? "-" : "+"}{formatTZS(row.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Trust Score</p>
                <p className="text-3xl font-bold">{disclosure.trustScore?.score ?? "—"}</p>
                <Badge variant="outline">{disclosure.trustScore?.riskLevel ?? "unknown"} risk</Badge>
              </div>
              {disclosure.wallet && (
                <div>
                  <p className="text-xs text-muted-foreground">Link-Up wallet</p>
                  <p className="font-semibold">{formatTZS(disclosure.wallet.balance)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Loan history</p>
                <p className="font-semibold">{disclosure.loanHistory?.length ?? 0} facilities</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verified assets</p>
                <p className="font-semibold">{disclosure.assets?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          {["submitted", "under_review"].includes(disclosure.application.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <DecisionPanel
                  applicationId={id}
                  requestedAmount={disclosure.application.amount}
                  requestedTerm={disclosure.application.termDays}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
