import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddFinancialRecordForm } from "@/components/dashboard/add-financial-record-form"
import { StatementImportForm } from "@/components/dashboard/statement-import-form"
import { formatTZS } from "@/lib/format"
import { FinancialsChart } from "@/components/dashboard/financials-chart"

export default async function FinancialsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const [
    { data: records },
    { data: importedTransactions },
    { data: connections },
  ] = await Promise.all([
    admin
      .from("financial_records")
      .select("*")
      .eq("user_id", session.userId)
      .order("record_date", { ascending: false }),
    admin
      .from("imported_transactions")
      .select("id, record_date, record_type, amount, description, reference")
      .eq("user_id", session.userId)
      .order("record_date", { ascending: false })
      .limit(100),
    admin
      .from("financial_connections")
      .select("id, connection_type, provider, account_mask, access_mode, status, last_synced_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false }),
  ])

  const allCashflow = [...(records ?? []), ...(importedTransactions ?? [])]

  const totalIncome =
    allCashflow.filter((r) => r.record_type === "income").reduce((acc, curr) => acc + Number(curr.amount), 0) ||
    0
  const totalExpense =
    allCashflow.filter((r) => r.record_type === "expense").reduce((acc, curr) => acc + Number(curr.amount), 0) ||
    0
  const netCashFlow = totalIncome - totalExpense

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Financial Statements</h1>
        <p className="text-muted-foreground">
          Import mobile-money history or log cash flow manually to improve your Trust Score.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Income</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatTZS(totalIncome)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatTZS(totalExpense)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Cash Flow</CardDescription>
            <CardTitle className={`text-2xl ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatTZS(netCashFlow)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scan transaction history</CardTitle>
            <CardDescription>
              Upload a CSV statement export. We analyse volume, consistency and net cash flow for your Trust
              Score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatementImportForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log Financial Entry</CardTitle>
            <CardDescription>
              Record cash flows manually when you do not have a CSV export.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddFinancialRecordForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected financial sources</CardTitle>
          <CardDescription>
            Link-Up currently supports consented statement imports. Direct provider APIs are added
            only through contracted bank/mobile-money integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!connections?.length ? (
            <p className="text-sm text-muted-foreground">
              No sources connected. Upload a statement above to register a source.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {connections.map((connection) => (
                <div key={connection.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium capitalize">{connection.provider.replace("_", " ")}</p>
                    <span className="text-xs capitalize text-emerald-600">{connection.status}</span>
                  </div>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {connection.connection_type.replace("_", " ")} ·{" "}
                    {connection.access_mode.replace("_", " ")}
                  </p>
                  {connection.last_synced_at && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last synced {new Date(connection.last_synced_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Overview</CardTitle>
          <CardDescription>Recent income and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialsChart records={records || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imported bank / mobile-money transactions</CardTitle>
          <CardDescription>
            These rows remain private unless you explicitly grant a lender
            <code className="mx-1 rounded bg-muted px-1">cashflow.transactions</code>
            consent for one application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!importedTransactions?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No imported transactions.
            </p>
          ) : (
            <div className="max-h-96 divide-y overflow-auto rounded-xl border">
              {importedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {transaction.description ?? "Imported transaction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.record_date).toLocaleDateString()}
                      {transaction.reference ? ` · ${transaction.reference}` : ""}
                    </p>
                  </div>
                  <p
                    className={
                      transaction.record_type === "income"
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-red-600"
                    }
                  >
                    {transaction.record_type === "expense" ? "-" : "+"}
                    {formatTZS(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {records && records.length > 0 ? (
              records.slice(0, 10).map((r) => (
                <div key={r.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{r.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.record_date).toLocaleDateString()} · {r.record_type}
                    </p>
                  </div>
                  <div
                    className={`font-semibold ${
                      r.record_type === "income"
                        ? "text-green-600"
                        : r.record_type === "expense"
                          ? "text-red-600"
                          : "text-foreground"
                    }`}
                  >
                    {r.record_type === "expense" ? "-" : ""}
                    {formatTZS(r.amount)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No financial records found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
