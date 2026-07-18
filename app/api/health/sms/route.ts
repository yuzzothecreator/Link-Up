import { NextResponse } from "next/server"
import { getBriqPublicStatus, sendSms } from "@/lib/sms/briq"

/**
 * GET /api/health/sms — checks whether Briq env is present (no secrets).
 * POST /api/health/sms { "phone": "+2557..." } — optional live test (requires HEALTH_SMS_SECRET).
 */
export async function GET() {
  const status = getBriqPublicStatus()
  return NextResponse.json({
    ok: status.configured,
    ...status,
    hint: status.configured
      ? "BRIQ_API_KEY is set. Instant SMS uses sender_id from status.senderId."
      : "Set BRIQ_API_KEY and BRIQ_SENDER_ID=BRIQ OTP in Vercel Production, then redeploy.",
  })
}

export async function POST(request: Request) {
  const secret = process.env.HEALTH_SMS_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Set HEALTH_SMS_SECRET to enable live SMS tests." },
      { status: 403 },
    )
  }

  const header = request.headers.get("x-health-secret")
  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { phone?: string }
  if (!body.phone) {
    return NextResponse.json({ error: "Provide phone" }, { status: 400 })
  }

  const result = await sendSms(
    body.phone,
    "Link-Up SMS health check. If you received this, Briq delivery is working.",
  )

  return NextResponse.json({
    ...getBriqPublicStatus(),
    send: result,
  })
}
