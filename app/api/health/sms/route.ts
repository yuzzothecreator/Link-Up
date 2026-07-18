import { NextResponse } from "next/server"
import { getBriqPublicStatus, sendSms } from "@/lib/sms/briq"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function assertHealthAccess(request: Request) {
  const secret = process.env.HEALTH_SMS_SECRET
  if (!secret) return false
  return request.headers.get("x-health-secret") === secret
}

/**
 * GET /api/health/sms — Briq config probe (requires HEALTH_SMS_SECRET).
 * POST /api/health/sms { "phone": "+2557..." } — live SMS test (same secret).
 */
export async function GET(request: Request) {
  if (!assertHealthAccess(request)) return unauthorized()

  const status = getBriqPublicStatus()
  return NextResponse.json({
    ok: status.configured,
    configured: status.configured,
    senderId: status.senderId,
    hint: status.configured
      ? "Briq API key is present."
      : "Set BRIQ_API_KEY and BRIQ_SENDER_ID=BRIQ OTP in Vercel Production.",
  })
}

export async function POST(request: Request) {
  if (!assertHealthAccess(request)) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as { phone?: string }
  if (!body.phone) {
    return NextResponse.json({ error: "Provide phone" }, { status: 400 })
  }

  const result = await sendSms(
    body.phone,
    "Link-Up SMS health check. If you received this, Briq delivery is working.",
  )

  return NextResponse.json({
    configured: getBriqPublicStatus().configured,
    send: { ok: result.ok, mock: result.mock, error: result.error },
  })
}
