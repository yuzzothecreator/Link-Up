/**
 * Briq SMS + OTP adapter.
 *
 * Docs: https://docs.briq.tz
 * API Base: https://karibu.briq.tz/v1
 *
 * Messaging: POST /message/send-instant
 * OTP:      POST /otp/request | /otp/verify | /otp/resend
 *
 * Sender ID rules (Briq): 3–11 chars, A–Z / 0–9 only — no spaces or hyphens.
 * Invalid sender IDs often return API success but never deliver to the handset.
 */

const BRIQ_BASE_URL = process.env.BRIQ_BASE_URL ?? "https://karibu.briq.tz/v1"

export interface SendSmsResult {
  ok: boolean
  mock: boolean
  messageId?: string
  error?: string
}

export interface BriqOtpResult {
  ok: boolean
  mock: boolean
  error?: string
  remainingAttempts?: number
  expiresAt?: string
}

export function isBriqMockMode() {
  return !process.env.BRIQ_API_KEY
}

/** Briq expects E.164 digits only (no '+'). */
export function toBriqPhone(phone: string) {
  return phone.replace(/[^\d]/g, "")
}

/**
 * Normalize sender ID to Briq rules: 3–11 alphanumeric characters.
 * Returns undefined when unset/invalid so Briq uses the account default.
 */
export function resolveSenderId(): string | undefined {
  const raw = process.env.BRIQ_SENDER_ID?.trim()
  if (!raw) return undefined

  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
  if (cleaned.length < 3 || cleaned.length > 11) {
    console.warn(
      `[Link-Up][SMS] BRIQ_SENDER_ID "${raw}" is invalid (need 3–11 letters/digits). Using Briq default sender.`,
    )
    return undefined
  }
  return cleaned
}

function briqHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": process.env.BRIQ_API_KEY!,
  }
}

function withOptionalAppKey<T extends Record<string, unknown>>(body: T): T {
  const appKey = process.env.BRIQ_APP_KEY
  if (appKey) return { ...body, app_key: appKey }
  return body
}

function formatBriqError(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `Briq responded ${status}`
  const d = data as Record<string, unknown>
  if (typeof d.detail === "string") return d.detail
  if (typeof d.message === "string") return d.message
  if (Array.isArray(d.detail)) {
    return d.detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg)
        }
        return JSON.stringify(item)
      })
      .join("; ")
  }
  return `Briq responded ${status}`
}

export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    console.log(`[Link-Up][SMS MOCK] To: ${to} | ${message}`)
    return { ok: true, mock: true }
  }

  const msisdn = toBriqPhone(to)
  if (!/^255\d{9}$/.test(msisdn)) {
    return { ok: false, mock: false, error: "Invalid phone number for SMS delivery." }
  }

  try {
    const body: Record<string, unknown> = {
      recipients: [msisdn],
      content: message,
    }
    const senderId = resolveSenderId()
    if (senderId) body.sender_id = senderId

    const res = await fetch(`${BRIQ_BASE_URL}/message/send-instant`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][SMS] Briq error:", res.status, data)
      return {
        ok: false,
        mock: false,
        error: formatBriqError(data, res.status),
      }
    }

    return {
      ok: true,
      mock: false,
      messageId: data?.data?.message_id ?? data?.job_id ?? data?.id,
    }
  } catch (err) {
    console.error("[Link-Up][SMS] Briq request failed:", err)
    return { ok: false, mock: false, error: "Network error contacting Briq" }
  }
}

/** Request a Briq-managed OTP delivered via SMS. */
export async function requestOtp(phone: string): Promise<BriqOtpResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    console.log(`[Link-Up][OTP MOCK] Request OTP for ${phone}`)
    return { ok: true, mock: true }
  }

  const msisdn = toBriqPhone(phone)
  if (!/^255\d{9}$/.test(msisdn)) {
    return { ok: false, mock: false, error: "Invalid phone number for verification." }
  }

  try {
    const payload: Record<string, unknown> = {
      phone_number: msisdn,
      delivery_method: "sms",
      otp_length: 6,
      minutes_to_expire: 10,
      message_template:
        "Your Link-Up code is {code}. Valid for {expiry} minutes. Do not share it.",
    }
    const senderId = resolveSenderId()
    if (senderId) payload.sender_id = senderId

    const res = await fetch(`${BRIQ_BASE_URL}/otp/request`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(withOptionalAppKey(payload)),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][OTP] Briq request error:", res.status, data)
      return { ok: false, mock: false, error: formatBriqError(data, res.status) }
    }

    console.log("[Link-Up][OTP] Code queued for", msisdn, "expires", data?.data?.expires_at)
    return {
      ok: true,
      mock: false,
      expiresAt: data?.data?.expires_at,
    }
  } catch (err) {
    console.error("[Link-Up][OTP] Briq request failed:", err)
    return { ok: false, mock: false, error: "Network error contacting Briq" }
  }
}

/**
 * Resend OTP — Briq /otp/request already invalidates prior codes,
 * so we reuse request for reliability.
 */
export async function resendOtp(phone: string): Promise<BriqOtpResult> {
  return requestOtp(phone)
}

/** Verify a user-submitted OTP against Briq's active code. */
export async function verifyOtpCode(phone: string, code: string): Promise<BriqOtpResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    if (/^\d{6}$/.test(code)) return { ok: true, mock: true }
    return { ok: false, mock: true, error: "Incorrect code. Please try again." }
  }

  const msisdn = toBriqPhone(phone)
  const cleanedCode = code.replace(/\D/g, "")

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(
        withOptionalAppKey({
          phone_number: msisdn,
          code: cleanedCode,
        }),
      ),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      const remaining = data?.data?.remaining_attempts
      const message = formatBriqError(data, res.status)
      return {
        ok: false,
        mock: false,
        error: remaining != null ? `${message} (${remaining} attempts remaining)` : message,
        remainingAttempts: remaining,
      }
    }

    return { ok: true, mock: false }
  } catch (err) {
    console.error("[Link-Up][OTP] Briq verify failed:", err)
    return { ok: false, mock: false, error: "Network error contacting Briq" }
  }
}
