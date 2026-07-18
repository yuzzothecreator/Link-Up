import { NextResponse } from "next/server"
import crypto from "crypto"
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
    const configuredSecret = process.env.TEMBO_WEBHOOK_SECRET
    if (!configuredSecret) {
      console.error("[Tembo webhook] TEMBO_WEBHOOK_SECRET is not configured")
      return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 })
    }

    const providedSecret =
      new URL(req.url).searchParams.get("token") ??
      req.headers.get("x-webhook-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

    const validSecret =
      providedSecret &&
      providedSecret.length === configuredSecret.length &&
      crypto.timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(configuredSecret),
      )
    if (!validSecret) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 })
    }

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
