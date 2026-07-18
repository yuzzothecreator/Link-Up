import { createAdminClient } from "@/lib/supabase/admin"
import { isBriqMockMode, requestOtp, verifyOtpCode } from "@/lib/sms/briq"

const RESEND_WINDOW_MS = 60 * 1000
const MAX_SENDS_PER_HOUR = 5

const TEST_NUMBERS: Record<string, string> = {
  "+255711111111": "Admin User",
  "+255722222222": "Borrower User",
  "+255733333333": "Lender User",
}

function allowTestOtp() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_OTP === "true"
}

/**
 * Creates and sends an OTP via Briq's OTP API (real SMS).
 * Enforces app-level rate limiting: 1 send / 60s and 5 / hour per phone.
 */
export async function issueOtp(phone: string, fullName?: string) {
  if (allowTestOtp() && TEST_NUMBERS[phone]) {
    return { ok: true as const }
  }

  const admin = createAdminClient()
  const now = Date.now()

  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const { data: recent } = await admin
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: false })

  if (recent && recent.length > 0) {
    const last = new Date(recent[0].created_at).getTime()
    if (now - last < RESEND_WINDOW_MS) {
      const wait = Math.ceil((RESEND_WINDOW_MS - (now - last)) / 1000)
      return { ok: false as const, error: `Please wait ${wait}s before requesting another code.` }
    }
    if (recent.length >= MAX_SENDS_PER_HOUR) {
      return { ok: false as const, error: "Too many code requests. Try again later." }
    }
  }

  // Always use /otp/request — Briq invalidates any prior active OTP automatically.
  const briq = await requestOtp(phone)

  if (!briq.ok) {
    return { ok: false as const, error: briq.error ?? "Could not send verification code." }
  }

  // Audit / rate-limit row only — Briq stores and hashes the real code.
  await admin.from("otp_codes").update({ consumed: true }).eq("phone", phone).eq("consumed", false)

  const { error } = await admin.from("otp_codes").insert({
    phone,
    code_hash: briq.mock ? "local-mock" : "briq-managed",
    full_name: fullName ?? null,
    expires_at: briq.expiresAt
      ? new Date(briq.expiresAt).toISOString()
      : new Date(now + 10 * 60 * 1000).toISOString(),
  })

  if (error) {
    console.error("[OTP] Database error inserting audit row:", error)
    // SMS already sent — don't fail the user on audit insert.
  }

  // Record notification without storing the plaintext code.
  await admin.from("notifications").insert({
    user_id: null,
    channel: "sms",
    type: "otp",
    message: briq.mock
      ? `[MOCK] Verification code would be sent to ${phone}`
      : `Verification code sent via Briq SMS to ${phone}`,
    status: "sent",
  })

  if (briq.mock || isBriqMockMode()) {
    console.log(
      `[Link-Up][OTP MOCK] Code for ${phone}: use any 6-digit code (Briq not configured)`,
    )
  }

  return { ok: true as const }
}

/**
 * Verifies an OTP via Briq. On success returns stored full_name when available.
 */
export async function verifyOtp(phone: string, code: string) {
  if (allowTestOtp() && code === "123456" && TEST_NUMBERS[phone]) {
    return { ok: true as const, fullName: TEST_NUMBERS[phone] }
  }

  const briq = await verifyOtpCode(phone, code)
  if (!briq.ok) {
    return { ok: false as const, error: briq.error ?? "Incorrect code. Please try again." }
  }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from("otp_codes")
    .select("id, full_name")
    .eq("phone", phone)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (row) {
    await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
  }

  return { ok: true as const, fullName: (row?.full_name as string | null) ?? null }
}
