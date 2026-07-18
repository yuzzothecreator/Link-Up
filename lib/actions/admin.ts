"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/guards"
import { recalculateTrustScore } from "@/lib/trust/engine"
import { notify } from "@/lib/notifications"
import type { ActionState } from "@/lib/actions/auth"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  return requireRole("admin")
}

export async function approveLoanAction(loanId: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: loan, error } = await admin
    .from("loans")
    .update({ status: "active" })
    .eq("id", loanId)
    .eq("status", "pending")
    .select("borrower_id, amount, profiles:borrower_id(phone)")
    .single()

  if (error || !loan) return { error: "Failed to approve loan." }

  // Disburse funds to the user's wallet
  const { data: wallet } = await admin
    .from("wallets")
    .select("balance")
    .eq("user_id", loan.borrower_id)
    .single()

  if (wallet) {
    await admin
      .from("wallets")
      .update({ balance: Number(wallet.balance) + Number(loan.amount) })
      .eq("user_id", loan.borrower_id)

    // Record the disbursement transaction
    await admin.from("transactions").insert({
      user_id: loan.borrower_id,
      type: "loan_disbursement",
      amount: loan.amount,
      status: "completed",
      description: "Loan disbursement",
    })
  }

  // @ts-expect-error - Profile relation typing
  const phone = loan.profiles?.phone
  if (phone) {
    await notify({
      phone,
      type: "loan_approved",
      message: `Your loan of TZS ${Number(loan.amount).toLocaleString()} has been approved and disbursed to your wallet.`,
    })
  }

  return { success: true, message: "Loan approved and funds disbursed." }
}

export async function rejectLoanAction(loanId: string, reason: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: loan, error } = await admin
    .from("loans")
    .update({ status: "rejected" })
    .eq("id", loanId)
    .eq("status", "pending")
    .select("profiles:borrower_id(phone)")
    .single()

  if (error || !loan) return { error: "Failed to reject loan." }

  // @ts-expect-error - Profile relation typing
  const phone = loan.profiles?.phone
  if (phone) {
    await notify({
      phone,
      type: "loan_rejected",
      message: `Your loan application was rejected. Reason: ${reason}. Please improve your Trust Score and try again.`,
    })
  }

  return { success: true, message: "Loan rejected." }
}

export async function approveKycAction(documentId: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: doc, error } = await admin
    .from("documents")
    .update({ status: "approved", verified_at: new Date().toISOString() })
    .eq("id", documentId)
    .select("user_id, type")
    .single()

  if (error || !doc) return { error: "Failed to approve document." }

  if (doc.type === "national_id") {
    await admin
      .from("profiles")
      .update({
        nida_verification_status: "verified",
        nida_verified_at: new Date().toISOString(),
      })
      .eq("id", doc.user_id)
  }

  await recalculateTrustScore(doc.user_id)

  return { success: true, message: "Document approved." }
}

export async function rejectKycAction(documentId: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: doc, error } = await admin
    .from("documents")
    .update({ status: "rejected" })
    .eq("id", documentId)
    .select("user_id, type")
    .single()

  if (error) return { error: "Failed to reject document." }

  if (doc?.type === "national_id") {
    await admin
      .from("profiles")
      .update({ nida_verification_status: "rejected" })
      .eq("id", doc.user_id)
    await recalculateTrustScore(doc.user_id)
  }

  return { success: true, message: "Document rejected." }
}

/** Manually confirm a structurally-valid NIDA after review. */
export async function approveNidaAction(userId: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from("profiles")
    .update({
      nida_verification_status: "verified",
      nida_verified_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) return { error: "Failed to verify NIDA." }

  await recalculateTrustScore(userId)
  revalidatePath("/admin/kyc")
  return { success: true, message: "NIDA marked as verified." }
}

export async function rejectNidaAction(userId: string): Promise<ActionState> {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from("profiles")
    .update({ nida_verification_status: "rejected" })
    .eq("id", userId)

  if (error) return { error: "Failed to reject NIDA." }

  await recalculateTrustScore(userId)
  revalidatePath("/admin/kyc")
  return { success: true, message: "NIDA rejected." }
}

export async function verifyAssetAction(assetId: string, userId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from("assets")
    .update({ status: "verified" })
    .eq("id", assetId)

  if (error) return { error: "Failed to verify asset." }

  // Recalculate trust score since a verified asset adds to the score
  await recalculateTrustScore(userId)
  
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

export async function rejectAssetAction(assetId: string) {
  await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from("assets")
    .update({ status: "rejected" })
    .eq("id", assetId)

  if (error) return { error: "Failed to reject asset." }

  return { success: true }
}
