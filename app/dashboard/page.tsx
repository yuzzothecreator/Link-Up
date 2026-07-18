import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS } from "@/lib/format"
import { StatCard } from "@/components/dashboard/stat-card"
import { TrustScoreRing } from "@/components/dashboard/trust-score-ring"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Wallet,
  TrendingUp,
  Landmark,
  PiggyBank,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import Link from "next/link"

export default async function DashboardOverview() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const [
    { data: wallet },
    { data: trustScore },
    { data: activeLoans },
    { data: recentTxns },
    { data: profile },
  ] = await Promise.all([
    admin.from("wallets").select("balance").eq("user_id", session.userId).maybeSingle(),
    admin.from("trust_scores").select("score, risk_level, breakdown").eq("user_id", session.userId).maybeSingle(),
    admin.from("loans").select("id").eq("borrower_id", session.userId).in("status", ["active", "pending"]),
    admin
      .from("transactions")
      .select("id, type, amount, status, description, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin.from("profiles").select("full_name").eq("id", session.userId).single(),
  ])

  const balance = Number(wallet?.balance ?? 0)
  const score = trustScore?.score ?? 0
  const loanCount = activeLoans?.length ?? 0
  const txns = recentTxns ?? []

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your account and activity.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Wallet Balance"
          value={formatTZS(balance)}
          icon={Wallet}
          trend={{ value: "+12%", direction: "up" }}
        />
        <StatCard
          title="Trust Score"
          value={`${score} / 1,000`}
          icon={TrendingUp}
          trend={{ value: score >= 400 ? "Good" : "Build it", direction: score >= 400 ? "up" : "flat" }}
        />
        <StatCard
          title="Active Loans"
          value={String(loanCount)}
          icon={Landmark}
        />
        <StatCard
          title="Total Saved"
          value={formatTZS(balance)}
          subtitle="Wallet balance"
          icon={PiggyBank}
        />
      </div>

      {/* Trust score + Recent transactions */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Trust Score Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-card-foreground">Trust Score</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your financial credibility</p>
          <div className="mt-6 flex justify-center">
            <TrustScoreRing score={score} />
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/trust-score">
                View breakdown
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">Recent Transactions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your latest activity</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transactions">
                View all
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {txns.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No transactions yet"
                description="Make your first deposit to get started."
                action={
                  <Button size="sm" asChild>
                    <Link href="/dashboard/wallet">Deposit now</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {txns.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        tx.type === "deposit"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {tx.type === "deposit" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground capitalize">
                        {tx.type?.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "deposit" ? "text-emerald-600" : "text-foreground"
                      }`}
                    >
                      {tx.type === "deposit" ? "+" : "-"}
                      {formatTZS(tx.amount)}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/wallet"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-card-foreground">Deposit Funds</p>
            <p className="text-sm text-muted-foreground">Add money to your wallet via mobile money</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/dashboard/loans"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-card-foreground">Apply for Loan</p>
            <p className="text-sm text-muted-foreground">Get funds based on your Trust Score</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}
