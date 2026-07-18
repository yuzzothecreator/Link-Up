import { createAdminClient } from "@/lib/supabase/admin"
import {
  auditDataAccess,
  requireLenderApplicationAccess,
  type DisclosureScope,
} from "@/lib/marketplace/access"

export interface UnderwritingDisclosure {
  application: {
    id: string
    amount: number
    termDays: number
    purpose: string
    status: string
    createdAt: string
  }
  identity?: {
    name: string | null
    phoneVerified: boolean
    nidaStatus: string
    region: string | null
  }
  business?: {
    name: string | null
    type: string | null
    location: string | null
    yearsInOperation: number | null
    declaredDailyIncome: number
  }
  trustScore?: {
    score: number
    riskLevel: string
    breakdown?: Record<string, number>
  }
  cashflow?: {
    transactionCount: number
    totalIncome: number
    totalExpenses: number
    netCashflow: number
    transactions?: Array<{
      date: string
      type: string
      amount: number
      description: string | null
    }>
  }
  wallet?: { balance: number }
  loanHistory?: Array<{
    amount: number
    status: string
    amountRepaid: number
    createdAt: string
  }>
  assets?: Array<{ name: string; type: string; estimatedValue: number; status: string }>
  consentScopes: DisclosureScope[]
}

/** Build a minimal disclosure; no lender receives fields outside consent scopes. */
export async function buildUnderwritingDisclosure(
  applicationId: string,
): Promise<UnderwritingDisclosure> {
  const access = await requireLenderApplicationAccess(applicationId)
  const admin = createAdminClient()

  const { data: application } = await admin
    .from("loan_applications")
    .select("id, amount, term_days, purpose, status, created_at")
    .eq("id", applicationId)
    .single()

  if (!application) throw new Error("Application not found.")

  const disclosure: UnderwritingDisclosure = {
    application: {
      id: application.id,
      amount: Number(application.amount),
      termDays: application.term_days,
      purpose: application.purpose,
      status: application.status,
      createdAt: application.created_at,
    },
    consentScopes: access.scopes,
  }

  const scopesRead: DisclosureScope[] = []

  if (access.scopes.includes("identity.summary")) {
    const { data } = await admin
      .from("profiles")
      .select("full_name, is_phone_verified, nida_verification_status, region")
      .eq("id", access.borrowerId)
      .single()
    if (data) {
      disclosure.identity = {
        name: data.full_name,
        phoneVerified: data.is_phone_verified,
        nidaStatus: data.nida_verification_status,
        region: data.region,
      }
    }
    scopesRead.push("identity.summary")
  }

  if (access.scopes.includes("business.profile")) {
    const { data } = await admin
      .from("profiles")
      .select("business_name, business_type, business_location, years_in_operation, daily_income")
      .eq("id", access.borrowerId)
      .single()
    if (data) {
      disclosure.business = {
        name: data.business_name,
        type: data.business_type,
        location: data.business_location,
        yearsInOperation: data.years_in_operation,
        declaredDailyIncome: Number(data.daily_income ?? 0),
      }
    }
    scopesRead.push("business.profile")
  }

  if (
    access.scopes.includes("trust_score.summary") ||
    access.scopes.includes("trust_score.breakdown")
  ) {
    const { data } = await admin
      .from("trust_scores")
      .select("score, risk_level, breakdown")
      .eq("user_id", access.borrowerId)
      .maybeSingle()
    disclosure.trustScore = {
      score: data?.score ?? 0,
      riskLevel: data?.risk_level ?? "unknown",
      ...(access.scopes.includes("trust_score.breakdown")
        ? { breakdown: (data?.breakdown ?? {}) as Record<string, number> }
        : {}),
    }
    if (access.scopes.includes("trust_score.summary")) scopesRead.push("trust_score.summary")
    if (access.scopes.includes("trust_score.breakdown")) scopesRead.push("trust_score.breakdown")
  }

  if (
    access.scopes.includes("cashflow.aggregates") ||
    access.scopes.includes("cashflow.transactions")
  ) {
    const { data } = await admin
      .from("imported_transactions")
      .select("record_date, record_type, amount, description")
      .eq("user_id", access.borrowerId)
      .order("record_date", { ascending: false })
      .limit(200)
    const rows = data ?? []
    const income = rows
      .filter((row) => row.record_type === "income")
      .reduce((sum, row) => sum + Number(row.amount), 0)
    const expenses = rows
      .filter((row) => row.record_type === "expense")
      .reduce((sum, row) => sum + Number(row.amount), 0)
    disclosure.cashflow = {
      transactionCount: rows.length,
      totalIncome: income,
      totalExpenses: expenses,
      netCashflow: income - expenses,
      ...(access.scopes.includes("cashflow.transactions")
        ? {
            transactions: rows.map((row) => ({
              date: row.record_date,
              type: row.record_type,
              amount: Number(row.amount),
              description: row.description,
            })),
          }
        : {}),
    }
    if (access.scopes.includes("cashflow.aggregates")) scopesRead.push("cashflow.aggregates")
    if (access.scopes.includes("cashflow.transactions")) scopesRead.push("cashflow.transactions")
  }

  if (access.scopes.includes("wallet.summary")) {
    const { data } = await admin
      .from("wallets")
      .select("balance")
      .eq("user_id", access.borrowerId)
      .maybeSingle()
    disclosure.wallet = { balance: Number(data?.balance ?? 0) }
    scopesRead.push("wallet.summary")
  }

  if (access.scopes.includes("loan_history")) {
    const { data } = await admin
      .from("loans")
      .select("amount, status, amount_repaid, created_at")
      .eq("borrower_id", access.borrowerId)
      .order("created_at", { ascending: false })
      .limit(20)
    disclosure.loanHistory = (data ?? []).map((loan) => ({
      amount: Number(loan.amount),
      status: loan.status,
      amountRepaid: Number(loan.amount_repaid),
      createdAt: loan.created_at,
    }))
    scopesRead.push("loan_history")
  }

  if (access.scopes.includes("assets.summary")) {
    const { data } = await admin
      .from("assets")
      .select("name, type, estimated_value, status")
      .eq("user_id", access.borrowerId)
    disclosure.assets = (data ?? []).map((asset) => ({
      name: asset.name,
      type: asset.type,
      estimatedValue: Number(asset.estimated_value),
      status: asset.status,
    }))
    scopesRead.push("assets.summary")
  }

  await auditDataAccess(access, "underwriting.disclosure_viewed", scopesRead, "borrower_disclosure")
  return disclosure
}
