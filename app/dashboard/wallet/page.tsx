import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { DepositForm } from "./deposit-form"
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Wallet · Link-Up" }

export default async function WalletPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const [{ data: wallet }, { data: transactions }, { data: profile }] = await Promise.all([
    admin.from("wallets").select("balance").eq("user_id", session.userId).maybeSingle(),
    admin
      .from("transactions")
      .select("id, type, amount, status, description, created_at")
      .eq("user_id", session.userId)
      .in("type", ["deposit", "withdrawal"])
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("profiles")
      .select("mobile_money_number, mobile_money_provider, phone")
      .eq("id", session.userId)
      .maybeSingle(),
  ])

  const balance = Number(wallet?.balance ?? 0)
  const txns = transactions ?? []
  const payPhone = profile?.mobile_money_number || profile?.phone || session.phone

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your deposits and withdrawals.</p>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-6 text-primary-foreground shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm font-medium text-primary-foreground/80">Available Balance</p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{formatTZS(balance)}</p>
          <p className="mt-1 text-sm text-primary-foreground/60">Tanzanian Shillings</p>
        </div>
      </div>

      {/* Deposit Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">Deposit via Mobile Money</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A payment prompt is sent to your phone
          {profile?.mobile_money_provider
            ? ` (${profile.mobile_money_provider})`
            : ""}
          . Confirm with your PIN to credit your wallet.
        </p>
        <div className="mt-4">
          <DepositForm payPhone={payPhone} />
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">Wallet History</h2>

        {txns.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={WalletIcon}
              title="No wallet activity"
              description="Your deposit and withdrawal history will appear here."
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
                    <p className="text-sm font-medium text-card-foreground capitalize">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("en-TZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
  )
}
