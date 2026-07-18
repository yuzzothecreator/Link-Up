import bcrypt from "bcryptjs"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBriqPublicStatus, isBriqMockMode, sendSms, verifyOtpCode } from "@/lib/sms/briq"
import { assertProductionSafePhone } from "@/lib/auth/staff"

const RESEND_WINDOW_MS = 60 * 1000
const MAX_SENDS_PER_HOUR = 5
const MAX_VERIFY_ATTEMPTS = 5
const OTP_TTL_MS = 10 * 60 * 1000

/** Local-only demo phones. Never work in production. */
const TEST_NUMBERS: Record<string, string> = {
  "+255711111111": "Admin User",
  "+255722222222": "Borrower User",
  "+255733333333": "Lender User",
}

function allowTestOtp() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_OTP === "true"
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Creates a local OTP, stores a hash, and delivers it via Briq instant SMS.
 * Instant SMS requires an approved sender_id (defaults to "BRIQ OTP").
 */
export async function issueOtp(phone: string, fullName?: string) {
  const blocked = assertProductionSafePhone(phone)
  if (blocked) return { ok: false as const, error: blocked }

  if (allowTestOtp() && TEST_NUMBERS[phone]) {
    return { ok: true as const }
  }

  const status = getBriqPublicStatus()
  if (!status.configured && process.env.NODE_ENV === "production") {
    console.error("[OTP] Briq not configured", status)
    return {
      ok: false as const,
      error: "SMS is not configured. Set BRIQ_API_KEY (and BRIQ_SENDER_ID=BRIQ OTP) in Vercel.",
    }
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

  const code = generateCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString()

  const sms = await sendSms(
    phone,
    `Your Link-Up verification code is ${code}. Valid for 10 minutes. Do not share it.`,
  )

  if (!sms.ok) {
    console.error("[OTP] SMS send failed", { phone, error: sms.error, briq: status })
    return {
      ok: false as const,
      error: sms.error ?? "Could not send verification code. Check Briq SMS settings.",
    }
  }

  await admin.from("otp_codes").update({ consumed: true }).eq("phone", phone).eq("consumed", false)

  const { error } = await admin.from("otp_codes").insert({
    phone,
    code_hash: sms.mock ? "local-mock" : codeHash,
    full_name: fullName ?? null,
    expires_at: expiresAt,
  })

  if (error) {
    console.error("[OTP] Database error inserting OTP row:", error)
    return { ok: false as const, error: "Could not save verification code. Try again." }
  }

  await admin.from("notifications").insert({
    user_id: null,
    channel: "sms",
    type: "otp",
    message: sms.mock
      ? `[MOCK] Verification code would be sent to ${phone}`
      : `Verification code sent via Briq SMS to ${phone}`,
    status: "sent",
  })

  if (sms.mock || isBriqMockMode()) {
    console.log(`[Link-Up][OTP MOCK] Code for ${phone}: ${code}`)
  } else {
    console.log("[Link-Up][OTP] SMS delivered path ok for", phone, "sender", status.senderId)
  }

  return { ok: true as const }
}

/**
 * Verifies a user OTP against the hashed local code.
 * Falls back to Briq OTP verify for older briq-managed rows.
 */
export async function verifyOtp(phone: string, code: string) {
  const blocked = assertProductionSafePhone(phone)
  if (blocked) return { ok: false as const, error: blocked }

  if (allowTestOtp() && code === "123456" && TEST_NUMBERS[phone]) {
    return { ok: true as const, fullName: TEST_NUMBERS[phone] }
  }

  const cleaned = code.replace(/\D/g, "")
  if (!/^\d{6}$/.test(cleaned)) {
    return { ok: false as const, error: "Enter the 6-digit code." }
  }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from("otp_codes")
    .select("id, full_name, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) {
    // Legacy Briq-managed codes (if any) — try remote verify.
    const briq = await verifyOtpCode(phone, cleaned)
    if (!briq.ok) {
      return { ok: false as const, error: briq.error ?? "No active code. Request a new one." }
    }
    return { ok: true as const, fullName: null }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
    return { ok: false as const, error: "Code expired. Request a new one." }
  }

  if ((row.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
    return { ok: false as const, error: "Too many attempts. Request a new code." }
  }

  if (row.code_hash === "local-mock") {
    await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
    return { ok: true as const, fullName: (row.full_name as string | null) ?? null }
  }

  if (row.code_hash === "briq-managed") {
    const briq = await verifyOtpCode(phone, cleaned)
    if (!briq.ok) {
      await admin
        .from("otp_codes")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id)
      return { ok: false as const, error: briq.error ?? "Incorrect code. Please try again." }
    }
    await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
    return { ok: true as const, fullName: (row.full_name as string | null) ?? null }
  }

  const match = await bcrypt.compare(cleaned, row.code_hash)
  if (!match) {
    await admin
      .from("otp_codes")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id)
    return { ok: false as const, error: "Incorrect code. Please try again." }
  }

  await admin.from("otp_codes").update({ consumed: true }).eq("id", row.id)
  return { ok: true as const, fullName: (row.full_name as string | null) ?? null }
}
