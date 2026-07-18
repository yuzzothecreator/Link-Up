import { NextResponse } from "next/server"
import { mapTemboStatus } from "@/lib/payments/tembo"
import { settleDeposit } from "@/lib/payments/settle-deposit"

/**
 * TemboPlus webhook — receives payment callbacks after USSD/STK authorization.
 *
 * Expected body: { statusCode, transactionId, transactionRef }
 * callbackUrl must be a publicly reachable HTTPS URL in production.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const reference = payload.transactionRef
    const paymentStatus = payload.statusCode

    if (!reference) {
      return NextResponse.json({ error: "Missing transactionRef" }, { status: 400 })
    }

    const txStatus = mapTemboStatus(paymentStatus)
    if (txStatus === "pending") {
      return NextResponse.json({ ok: true })
    }

    const result = await settleDeposit({
      reference,
      status: txStatus,
      providerRef: payload.transactionId,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Webhook error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
