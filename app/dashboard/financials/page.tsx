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

  const { data: records } = await admin
    .from("financial_records")
    .select("*")
    .eq("user_id", session.userId)
    .order("record_date", { ascending: false })

  const totalIncome =
    records?.filter((r) => r.record_type === "income").reduce((acc, curr) => acc + Number(curr.amount), 0) ||
    0
  const totalExpense =
    records?.filter((r) => r.record_type === "expense").reduce((acc, curr) => acc + Number(curr.amount), 0) ||
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
          <CardTitle>Cash Flow Overview</CardTitle>
          <CardDescription>Recent income and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialsChart records={records || []} />
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
