import { createAdminClient } from "@/lib/supabase/admin"

export interface TrustBreakdown {
  transactions: number // 0-100
  repayment: number // 0-100
  savings: number // 0-100
  accountAge: number // 0-100
  documents: number // 0-100
  identity: number // 0-100 — NIDA / phone verification
  cashflow: number // 0-100 — imported statement activity
}

export interface TrustResult {
  score: number // 0-1000
  riskLevel: "low" | "medium" | "high"
  breakdown: TrustBreakdown
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Trust Score (0–1000):
 *   transactions 30% + repayment 25% + cashflow 15% + savings 10%
 *   + documents 8% + identity 7% + accountAge 5%
 */
export function computeScore(b: TrustBreakdown): TrustResult {
  const weighted =
    b.transactions * 0.3 +
    b.repayment * 0.25 +
    b.cashflow * 0.15 +
    b.savings * 0.1 +
    b.documents * 0.08 +
    b.identity * 0.07 +
    b.accountAge * 0.05

  const score = Math.round(clamp(weighted) * 10)

  let riskLevel: TrustResult["riskLevel"] = "high"
  if (score >= 700) riskLevel = "low"
  else if (score >= 400) riskLevel = "medium"

  return { score, riskLevel, breakdown: { ...b } }
}

export async function recalculateTrustScore(userId: string): Promise<TrustResult> {
  const admin = createAdminClient()

  const [
    profileRes,
    walletRes,
    transactionsRes,
    loansRes,
    approvedDocsRes,
    importedRes,
    verifiedAssetsRes,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("created_at, is_phone_verified, nida_verification_status")
      .eq("id", userId)
      .single(),
    admin.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
    admin
      .from("transactions")
      .select("amount,type,status")
      .eq("user_id", userId)
      .eq("status", "completed"),
    admin.from("loans").select("status,amount,amount_repaid").eq("borrower_id", userId),
    admin
      .from("documents")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "approved"),
    admin
      .from("imported_transactions")
      .select("amount,record_type,record_date")
      .eq("user_id", userId),
    admin
      .from("assets")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["verified", "approved"]),
  ])

  const profile = profileRes.data
  const wallet = walletRes.data
  const transactions = transactionsRes.data
  const loans = loansRes.data
  const approvedDocs = approvedDocsRes.data
  const imported = importedRes.error ? [] : importedRes.data
  const verifiedAssets = verifiedAssetsRes.data

  // Platform wallet activity (deposits only — avoid counting loan disbursements as volume)
  const txns = (transactions ?? []).filter((t) => t.type === "deposit" || t.type === "repayment")
  const txnCount = txns.length
  const txnValue = txns.reduce((sum, t) => sum + Number(t.amount), 0)
  const transactionsScore = clamp(txnCount * 10 + txnValue / 40000)

  // Repayment
  const allLoans = loans ?? []
  const repaidLoans = allLoans.filter((l) => l.status === "repaid").length
  const defaulted = allLoans.filter((l) => l.status === "defaulted").length
  const activeProgress = allLoans
    .filter((l) => l.status === "active")
    .reduce(
      (acc, l) =>
        acc + (Number(l.amount) > 0 ? Number(l.amount_repaid) / Number(l.amount) : 0),
      0,
    )
  let repaymentScore = 50
  repaymentScore += repaidLoans * 20
  repaymentScore += activeProgress * 15
  repaymentScore -= defaulted * 40
  repaymentScore = clamp(repaymentScore)

  // Savings
  const balance = Number(wallet?.balance ?? 0)
  const savingsScore = clamp(balance / 10000)

  // Account age
  const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now()
  const ageDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
  const accountAgeScore = clamp((ageDays / 180) * 100)

  // Approved documents + verified assets
  const docCount = (approvedDocs ?? []).length + (verifiedAssets ?? []).length
  const documentsScore = clamp(docCount * 25)

  // Identity: phone + NIDA status
  let identityScore = 0
  if (profile?.is_phone_verified) identityScore += 40
  const nidaStatus = profile?.nida_verification_status
  if (nidaStatus === "verified") identityScore += 60
  else if (nidaStatus === "pending_manual" || nidaStatus === "format_valid") identityScore += 25
  identityScore = clamp(identityScore)

  // Imported statement cashflow (last 90 days signal)
  const imports = imported ?? []
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recent = imports.filter((r) => new Date(r.record_date).getTime() >= cutoff)
  const income = recent
    .filter((r) => r.record_type === "income")
    .reduce((s, r) => s + Number(r.amount), 0)
  const expense = recent
    .filter((r) => r.record_type === "expense")
    .reduce((s, r) => s + Number(r.amount), 0)
  const net = income - expense
  const volume = income + expense
  const consistency = Math.min(recent.length, 60)
  const cashflowScore = clamp(
    consistency * 1.2 + volume / 80000 + Math.max(0, net) / 50000,
  )

  const result = computeScore({
    transactions: Math.round(transactionsScore),
    repayment: Math.round(repaymentScore),
    savings: Math.round(savingsScore),
    accountAge: Math.round(accountAgeScore),
    documents: Math.round(documentsScore),
    identity: Math.round(identityScore),
    cashflow: Math.round(cashflowScore),
  })

  await admin.from("trust_scores").upsert(
    {
      user_id: userId,
      score: result.score,
      risk_level: result.riskLevel,
      breakdown: result.breakdown,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  return result
}
