import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isMockMode } from "@/lib/payments/tembo"
import { settleDeposit } from "@/lib/payments/settle-deposit"

/**
 * DEVELOPMENT ONLY — manually complete a pending deposit when Tembo is in mock mode.
 */
export async function POST(req: Request) {
  if (!isMockMode() || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available when Tembo is configured" }, { status: 403 })
  }

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 })

  const admin = createAdminClient()
  const { data: tx } = await admin
    .from("transactions")
    .select("status")
    .eq("reference", reference)
    .maybeSingle()

  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (tx.status !== "pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 })
  }

  const result = await settleDeposit({
    reference,
    status: "completed",
    providerRef: `SIM-${reference}`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Simulated payment success" })
}
