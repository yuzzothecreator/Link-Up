import { createAdminClient } from "@/lib/supabase/admin"
import { recalculateTrustScore } from "@/lib/trust/engine"
import { notify } from "@/lib/notifications"
import { persistProviderRef } from "@/lib/payments/provider-ref"

/**
 * Apply a final collection outcome to a pending deposit.
 * Idempotent: only credits when the transaction is still pending.
 */
export async function settleDeposit(params: {
  reference: string
  status: "completed" | "failed"
  providerRef?: string | null
}) {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("transactions")
    .select("id, user_id, amount, type, status, description")
    .eq("reference", params.reference)
    .maybeSingle()

  if (!existing) {
    return { ok: false as const, error: "Transaction not found" }
  }

  if (existing.status !== "pending") {
    return { ok: true as const, alreadySettled: true as const, status: existing.status }
  }

  if (params.providerRef) {
    await persistProviderRef(admin, params.reference, params.providerRef, existing.description)
  }

  const { data: tx, error } = await admin
    .from("transactions")
    .update({ status: params.status })
    .eq("id", existing.id)
    .eq("status", "pending")
    .select("user_id, amount, type")
    .maybeSingle()

  // Another worker may have settled it between select and update.
  if (error || !tx) {
    return { ok: true as const, alreadySettled: true as const, status: params.status }
  }

  if (params.status === "completed" && tx.type === "deposit") {
    const { data: wallet } = await admin
      .from("wallets")
      .select("balance")
      .eq("user_id", tx.user_id)
      .single()

    if (wallet) {
      await admin
        .from("wallets")
        .update({ balance: Number(wallet.balance) + Number(tx.amount) })
        .eq("user_id", tx.user_id)
    }

    await recalculateTrustScore(tx.user_id)

    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", tx.user_id)
      .single()

    if (profile?.phone) {
      await notify({
        userId: tx.user_id,
        phone: profile.phone,
        type: "payment_confirmation",
        message: `Your deposit of TZS ${Number(tx.amount).toLocaleString()} has been confirmed and added to your wallet.`,
      })
    }
  }

  if (params.status === "failed") {
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", tx.user_id)
      .single()

    if (profile?.phone) {
      await notify({
        userId: tx.user_id,
        phone: profile.phone,
        type: "payment_confirmation",
        message: `Your deposit of TZS ${Number(tx.amount).toLocaleString()} failed. Please try again.`,
      })
    }
  }

  return { ok: true as const, alreadySettled: false as const, status: params.status }
}
