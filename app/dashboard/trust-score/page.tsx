import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { TrustScoreRing } from "@/components/dashboard/trust-score-ring"
import { TrendingUp, FileCheck, Landmark, ArrowLeftRight, CheckCircle2 } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Trust Score · trustLink" }

export default async function TrustScorePage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: trustData } = await admin
    .from("trust_scores")
    .select("score, risk_level, breakdown")
    .eq("user_id", session.userId)
    .maybeSingle()

  const score = trustData?.score ?? 0
  const breakdown = (trustData?.breakdown as Record<string, number>) ?? {
    transactions: 0,
    repayment: 0,
    savings: 0,
    accountAge: 0,
    documents: 0,
    identity: 0,
    cashflow: 0,
  }

  const factors = [
    {
      id: "transactions",
      name: "Wallet Activity",
      description: "Completed deposits and repayments on the platform.",
      icon: ArrowLeftRight,
      value: breakdown.transactions ?? 0,
      weight: "30%",
    },
    {
      id: "repayment",
      name: "Repayment History",
      description: "On-time loan repayments significantly boost your score.",
      icon: Landmark,
      value: breakdown.repayment ?? 0,
      weight: "25%",
    },
    {
      id: "cashflow",
      name: "Statement Cash Flow",
      description: "Imported M-Pesa / bank history from the last 90 days.",
      icon: TrendingUp,
      value: breakdown.cashflow ?? 0,
      weight: "15%",
    },
    {
      id: "savings",
      name: "Wallet Savings",
      description: "Maintaining a balance proves financial stability.",
      icon: TrendingUp,
      value: breakdown.savings ?? 0,
      weight: "10%",
    },
    {
      id: "documents",
      name: "Verified Documents",
      description: "Only admin-approved ID and licenses count.",
      icon: FileCheck,
      value: breakdown.documents ?? 0,
      weight: "8%",
    },
    {
      id: "identity",
      name: "Identity Strength",
      description: "Phone OTP + NIDA verification status.",
      icon: FileCheck,
      value: breakdown.identity ?? 0,
      weight: "7%",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trust Score</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your financial credibility profile. Build your score to unlock better loans.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-sm lg:col-span-1">
          <TrustScoreRing score={score} size={220} strokeWidth={16} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {score >= 700
              ? "Excellent score! You qualify for our best rates."
              : score >= 400
                ? "Good score. Keep transacting to unlock higher limits."
                : "Needs work. Start by making deposits and verifying documents."}
          </p>
        </div>

        {/* Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-card-foreground">Score Breakdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">How your score is calculated (sub-scores out of 100).</p>

          <div className="mt-6 space-y-6">
            {factors.map((factor) => (
              <div key={factor.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <factor.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{factor.name}</p>
                      <p className="text-xs text-muted-foreground">{factor.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{factor.value} <span className="text-xs font-normal text-muted-foreground">/ 100</span></p>
                    <p className="text-[10px] text-primary font-medium">{factor.weight} weight</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${Math.max(5, factor.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">How to improve your score</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Verify your phone number with the SMS code",
            "Enter a real NIDA number that matches your date of birth",
            "Import your M-Pesa / mobile-money CSV statement",
            "Make regular wallet deposits",
            "Upload National ID and Business License for admin approval",
            "Repay loans on or before the due date",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
