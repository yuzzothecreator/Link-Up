import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSession } from "@/lib/auth/session"
import { getCollectionStatus } from "@/lib/payments/tembo"
import { settleDeposit } from "@/lib/payments/settle-deposit"
import { extractProviderRef } from "@/lib/payments/provider-ref"

/**
 * Poll Tembo for a pending deposit and settle locally when complete.
 * Useful in local/dev when Tembo cannot POST to localhost webhooks.
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reference = new URL(req.url).searchParams.get("reference")
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Prefer selecting provider_ref; fall back if the column is not migrated yet.
  let row: {
    id: string
    user_id: string
    amount: number
    status: string
    provider_ref?: string | null
    description?: string | null
    reference: string
  } | null = null

  const withCol = await admin
    .from("transactions")
    .select("id, user_id, amount, status, provider_ref, description, reference")
    .eq("reference", reference)
    .eq("user_id", session.userId)
    .maybeSingle()

  if (withCol.error?.message?.includes("provider_ref")) {
    const fallback = await admin
      .from("transactions")
      .select("id, user_id, amount, status, description, reference")
      .eq("reference", reference)
      .eq("user_id", session.userId)
      .maybeSingle()
    row = fallback.data
  } else {
    row = withCol.data
  }

  if (!row) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
  }

  if (row.status !== "pending") {
    return NextResponse.json({
      status: row.status,
      amount: row.amount,
      reference: row.reference,
    })
  }

  const providerRef = extractProviderRef(row)
  if (!providerRef) {
    return NextResponse.json({
      status: "pending",
      amount: row.amount,
      reference: row.reference,
      message: "Waiting for payment provider acknowledgement.",
    })
  }

  const remote = await getCollectionStatus(providerRef, row.reference)
  if (!remote.ok || remote.status === "pending") {
    return NextResponse.json({
      status: "pending",
      amount: row.amount,
      reference: row.reference,
      providerStatus: remote.rawStatus,
    })
  }

  await settleDeposit({
    reference: row.reference,
    status: remote.status,
    providerRef: remote.providerRef ?? providerRef,
  })

  return NextResponse.json({
    status: remote.status,
    amount: row.amount,
    reference: row.reference,
  })
}
