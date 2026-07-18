/**
 * Briq SMS + OTP adapter.
 *
 * Docs: https://docs.briq.tz
 * API Base: https://karibu.briq.tz/v1
 *
 * Messaging: POST /message/send-instant
 * OTP:      POST /otp/request | /otp/verify | /otp/resend
 *
 * When BRIQ_API_KEY is bound to a Developer App, app_key is resolved from the key.
 * Optional BRIQ_APP_KEY can be set for unbound / legacy keys.
 * If BRIQ_API_KEY is absent, adapters run in console mock mode.
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

export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    console.log(`[Link-Up][SMS MOCK] To: ${to} | ${message}`)
    return { ok: true, mock: true }
  }

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/message/send-instant`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify({
        recipients: [to],
        content: message,
        sender_id: process.env.BRIQ_SENDER_ID ?? "BIASHARA",
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][SMS] Briq error:", res.status, data)
      return {
        ok: false,
        mock: false,
        error: data?.message ?? data?.detail ?? `Briq responded ${res.status}`,
      }
    }

    return {
      ok: true,
      mock: false,
      messageId: data?.data?.message_id ?? data?.id,
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

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/otp/request`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(
        withOptionalAppKey({
          phone_number: toBriqPhone(phone),
          delivery_method: "sms",
          otp_length: 6,
          minutes_to_expire: 10,
          sender_id: process.env.BRIQ_SENDER_ID ?? "BIASHARA",
          message_template:
            "Your Link-Up verification code is {code}. It expires in {expiry} minutes. Do not share this code.",
        }),
      ),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][OTP] Briq request error:", res.status, data)
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : data?.message ?? `Briq responded ${res.status}`
      return { ok: false, mock: false, error: detail }
    }

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

/** Resend OTP (invalidates the previous active code). */
export async function resendOtp(phone: string): Promise<BriqOtpResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    console.log(`[Link-Up][OTP MOCK] Resend OTP for ${phone}`)
    return { ok: true, mock: true }
  }

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/otp/resend`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(
        withOptionalAppKey({
          phone_number: toBriqPhone(phone),
          delivery_method: "sms",
          otp_length: 6,
          minutes_to_expire: 10,
          sender_id: process.env.BRIQ_SENDER_ID ?? "BIASHARA",
          message_template:
            "Your Link-Up verification code is {code}. It expires in {expiry} minutes. Do not share this code.",
        }),
      ),
    })

    const data = await res.json().catch(() => ({}))

    // Some accounts may not expose /otp/resend — fall back to a fresh request.
    if (res.status === 404) {
      return requestOtp(phone)
    }

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][OTP] Briq resend error:", res.status, data)
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : data?.message ?? `Briq responded ${res.status}`
      return { ok: false, mock: false, error: detail }
    }

    return {
      ok: true,
      mock: false,
      expiresAt: data?.data?.expires_at,
    }
  } catch (err) {
    console.error("[Link-Up][OTP] Briq resend failed:", err)
    return { ok: false, mock: false, error: "Network error contacting Briq" }
  }
}

/** Verify a user-submitted OTP against Briq's active code. */
export async function verifyOtpCode(phone: string, code: string): Promise<BriqOtpResult> {
  const apiKey = process.env.BRIQ_API_KEY

  if (!apiKey) {
    // Local mock: accept any 6-digit code when Briq is not configured.
    if (/^\d{6}$/.test(code)) return { ok: true, mock: true }
    return { ok: false, mock: true, error: "Incorrect code. Please try again." }
  }

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: briqHeaders(),
      body: JSON.stringify(
        withOptionalAppKey({
          phone_number: toBriqPhone(phone),
          code: code.replace(/\D/g, ""),
        }),
      ),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      const remaining = data?.data?.remaining_attempts
      const message =
        typeof data?.detail === "string"
          ? data.detail
          : data?.message ?? "Incorrect code. Please try again."

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
