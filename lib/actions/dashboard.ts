"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSession } from "@/lib/auth/session"
import { initiatePayment, generateReference } from "@/lib/payments/tembo"
import { settleDeposit } from "@/lib/payments/settle-deposit"
import { persistProviderRef } from "@/lib/payments/provider-ref"
import { loanApplicationSchema, depositSchema } from "@/lib/validation"
import type { ActionState } from "@/lib/actions/auth"

async function requireAuth() {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  return session
}

/** Initiate a real mobile-money deposit via TemboPlus (USSD / STK on phone). */
export async function depositAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const parsed = depositSchema.safeParse({ amount: formData.get("amount") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid amount" }
  }

  const admin = createAdminClient()
  const amount = Math.round(parsed.data.amount)
  const reference = generateReference()

  const { data: profile } = await admin
    .from("profiles")
    .select("mobile_money_provider, mobile_money_number, phone")
    .eq("id", session.userId)
    .single()

  const payPhone = profile?.mobile_money_number || profile?.phone || session.phone
  const provider = profile?.mobile_money_provider ?? null

  const description = `Mobile money deposit via ${provider ?? "phone"}`

  const { error: txError } = await admin.from("transactions").insert({
    user_id: session.userId,
    type: "deposit",
    amount,
    status: "pending",
    reference,
    description,
  })
  if (txError) return { error: "Could not initiate deposit. Try again." }

  const result = await initiatePayment({
    reference,
    amount,
    phone: payPhone,
    provider,
    narration: "trustLink deposit",
  })

  if (!result.ok) {
    await admin.from("transactions").update({ status: "failed" }).eq("reference", reference)
    return { error: result.error ?? "Payment initiation failed." }
  }

  if (result.providerRef) {
    await persistProviderRef(admin, reference, result.providerRef, description)
  }

  // Mock mode (no Tembo credentials): auto-complete for local UX.
  if (result.mock) {
    await settleDeposit({
      reference,
      status: "completed",
      providerRef: result.providerRef,
    })
    return {
      success: true,
      message: `TZS ${amount.toLocaleString()} deposited successfully!`,
    }
  }

  return {
    success: true,
    pending: true,
    reference,
    message: `Payment prompt sent to ${payPhone}. Enter your PIN on your phone to confirm.`,
  }
}

/** Apply for a loan. */
export async function applyLoanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const parsed = loanApplicationSchema.safeParse({
    amount: formData.get("amount"),
    termDays: formData.get("termDays"),
    purpose: formData.get("purpose"),
    groupId: formData.get("groupId"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid application" }
  }

  const admin = createAdminClient()

  if (!session.isPhoneVerified) {
    return { error: "Verify your phone number before applying for a loan." }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("nida_verification_status, nida_number")
    .eq("id", session.userId)
    .maybeSingle()

  const nidaStatus = profile?.nida_verification_status as string | null | undefined
  if (!profile?.nida_number || nidaStatus === "rejected" || nidaStatus === "unverified") {
    return {
      error:
        "Complete NIDA identity verification before applying for a loan. Your NIDA must match your date of birth.",
    }
  }

  // Check trust score eligibility
  const { data: trustData } = await admin
    .from("trust_scores")
    .select("score, risk_level")
    .eq("user_id", session.userId)
    .single()

  if (!trustData || trustData.score < 200) {
    return { error: "Your Trust Score is too low to apply for a loan. Build your score first." }
  }

  // Calculate interest rate based on trust score
  let interestRate = 15 // default 15%
  if (trustData.score >= 700) interestRate = 5
  else if (trustData.score >= 500) interestRate = 8
  else if (trustData.score >= 400) interestRate = 10

  const interestAmount = Math.round((parsed.data.amount * interestRate * parsed.data.termDays) / (365 * 100))
  const totalRepayment = parsed.data.amount + interestAmount

  const { error } = await admin.from("loans").insert({
    borrower_id: session.userId,
    amount: parsed.data.amount,
    term_days: parsed.data.termDays,
    purpose: parsed.data.purpose,
    group_id: parsed.data.groupId || null,
    interest_rate: interestRate,
    interest_amount: interestAmount,
    total_repayment: totalRepayment,
    amount_repaid: 0,
    status: "pending",
  })

  if (error) return { error: "Could not submit your application. Try again." }

  return { success: true, message: "Loan application submitted! You'll be notified once it's reviewed." }
}

/** Update profile fields. */
export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const fullName = formData.get("fullName") as string
  const businessName = formData.get("businessName") as string
  const businessLocation = formData.get("businessLocation") as string

  const updates: Record<string, unknown> = {}
  if (fullName) updates.full_name = fullName
  if (businessName) updates.business_name = businessName
  if (businessLocation) updates.business_location = businessLocation

  if (Object.keys(updates).length === 0) {
    return { error: "No changes to save." }
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", session.userId)
  if (error) return { error: "Could not update profile. Try again." }

  return { success: true, message: "Profile updated successfully." }
}
