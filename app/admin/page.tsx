import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { StatCard } from "@/components/dashboard/stat-card"
import { Users, Landmark, AlertCircle, TrendingUp } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Admin Overview · trustLink" }

export default async function AdminOverview() {
  await requireRole("admin")
  const admin = createAdminClient()

  // We fetch counts using head requests for performance
  const [
    { count: totalUsers },
    { count: activeLoans },
    { count: defaultedLoans },
    { data: activeLoansData },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("loans").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("loans").select("id", { count: "exact", head: true }).eq("status", "defaulted"),
    admin.from("loans").select("amount").eq("status", "active"),
  ])

  const totalDisbursed = activeLoansData?.reduce((acc, l) => acc + Number(l.amount), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform health and metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={String(totalUsers ?? 0)}
          icon={Users}
        />
        <StatCard
          title="Active Loans"
          value={String(activeLoans ?? 0)}
          icon={Landmark}
        />
        <StatCard
          title="Total Active Volume (TZS)"
          value={totalDisbursed.toLocaleString()}
          icon={TrendingUp}
        />
        <StatCard
          title="Defaulted Loans"
          value={String(defaultedLoans ?? 0)}
          icon={AlertCircle}
          className="border-destructive/20 bg-destructive/5"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">System Activity</h2>
        <p className="mt-4 text-sm text-muted-foreground">Detailed charts and activity feeds would render here.</p>
      </div>
    </div>
  )
}
