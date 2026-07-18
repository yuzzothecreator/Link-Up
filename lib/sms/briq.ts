/**
 * Briq SMS + OTP adapter.
 *
 * Docs: https://docs.briq.tz
 * API Base: https://karibu.briq.tz/v1
 *
 * Important:
 * - `/message/send-instant` REQUIRES `sender_id` (422 if missing).
 * - Unapproved senders (e.g. Link-Up / LINKUP) may return HTTP 200 but never deliver.
 * - Safe default for this account: "BRIQ OTP"
 */

const BRIQ_BASE_URL = process.env.BRIQ_BASE_URL ?? "https://karibu.briq.tz/v1"
const DEFAULT_SENDER = "BRIQ OTP"

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

/** Trim + strip accidental quotes from Vercel/dashboard paste. */
export function getBriqApiKey(): string | undefined {
  let key = process.env.BRIQ_API_KEY?.trim()
  if (!key) return undefined
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim()
  }
  return key || undefined
}

export function isBriqMockMode() {
  return !getBriqApiKey()
}

/** Briq expects E.164 digits only (no '+'). */
export function toBriqPhone(phone: string) {
  return phone.replace(/[^\d]/g, "")
}

/**
 * Always returns a sender_id. Instant SMS will fail without one.
 * Invalid / brand names fall back to Briq's approved "BRIQ OTP".
 */
export function resolveSenderId(): string {
  const raw = process.env.BRIQ_SENDER_ID?.trim()
  if (!raw) return DEFAULT_SENDER

  const lower = raw.toLowerCase()
  if (["default", "none", "auto", "off", "blank", "n/a", "na", "-", "_"].includes(lower)) {
    return DEFAULT_SENDER
  }

  // These look valid but are not approved and silently kill delivery.
  const compact = raw.replace(/[\s-_]/g, "").toLowerCase()
  if (compact === "linkup" || compact === "linküp") {
    console.warn(
      `[Link-Up][SMS] BRIQ_SENDER_ID "${raw}" is not an approved Briq sender. Using "${DEFAULT_SENDER}".`,
    )
    return DEFAULT_SENDER
  }

  if (raw.toUpperCase() === "BRIQ OTP") return DEFAULT_SENDER

  // Approved custom IDs: 3–11 letters/digits, optional single spaces (e.g. BRIQ OTP).
  if (/^[A-Za-z0-9][A-Za-z0-9 ]{1,9}[A-Za-z0-9]$/.test(raw) || /^[A-Za-z0-9]{3,11}$/.test(raw)) {
    return raw.includes(" ") ? raw : raw.toUpperCase()
  }

  console.warn(
    `[Link-Up][SMS] BRIQ_SENDER_ID "${raw}" is invalid. Using "${DEFAULT_SENDER}".`,
  )
  return DEFAULT_SENDER
}

function briqHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  }
}

function formatBriqError(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `Briq responded ${status}`
  const d = data as Record<string, unknown>
  if (typeof d.detail === "string") return d.detail
  if (typeof d.message === "string") return d.message
  if (Array.isArray(d.errors)) {
    return d.errors
      .map((item) => {
        if (item && typeof item === "object" && "message" in item) {
          return String((item as { message: unknown }).message)
        }
        return JSON.stringify(item)
      })
      .join("; ")
  }
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
  const apiKey = getBriqApiKey()

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Link-Up][SMS] BRIQ_API_KEY is missing in production")
      return {
        ok: false,
        mock: false,
        error: "SMS is not configured on the server. Set BRIQ_API_KEY in Vercel.",
      }
    }
    console.log(`[Link-Up][SMS MOCK] To: ${to} | ${message}`)
    return { ok: true, mock: true }
  }

  const msisdn = toBriqPhone(to)
  if (!/^255\d{9}$/.test(msisdn)) {
    return { ok: false, mock: false, error: "Invalid phone number for SMS delivery." }
  }

  const senderId = resolveSenderId()

  try {
    const body = {
      recipients: [msisdn],
      content: message,
      sender_id: senderId,
    }

    const res = await fetch(`${BRIQ_BASE_URL}/message/send-instant`, {
      method: "POST",
      headers: briqHeaders(apiKey),
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][SMS] Briq error:", res.status, data, { senderId })
      return {
        ok: false,
        mock: false,
        error: formatBriqError(data, res.status),
      }
    }

    console.log("[Link-Up][SMS] Queued to", msisdn, "via", senderId, data?.status ?? "ok")
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

/** Legacy Briq-managed OTP request (kept as optional fallback). */
export async function requestOtp(phone: string): Promise<BriqOtpResult> {
  const apiKey = getBriqApiKey()

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        mock: false,
        error: "SMS is not configured on the server. Set BRIQ_API_KEY in Vercel.",
      }
    }
    console.log(`[Link-Up][OTP MOCK] Request OTP for ${phone}`)
    return { ok: true, mock: true }
  }

  const msisdn = toBriqPhone(phone)
  if (!/^255\d{9}$/.test(msisdn)) {
    return { ok: false, mock: false, error: "Invalid phone number for verification." }
  }

  const senderId = resolveSenderId()

  try {
    const payload = {
      phone_number: msisdn,
      delivery_method: "sms",
      otp_length: 6,
      minutes_to_expire: 10,
      sender_id: senderId,
    }

    const res = await fetch(`${BRIQ_BASE_URL}/otp/request`, {
      method: "POST",
      headers: briqHeaders(apiKey),
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok || data?.success === false) {
      console.error("[Link-Up][OTP] Briq request error:", res.status, data, { senderId })
      return { ok: false, mock: false, error: formatBriqError(data, res.status) }
    }

    console.log("[Link-Up][OTP] Code queued for", msisdn, "via", senderId)
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

export async function resendOtp(phone: string): Promise<BriqOtpResult> {
  return requestOtp(phone)
}

export async function verifyOtpCode(phone: string, code: string): Promise<BriqOtpResult> {
  const apiKey = getBriqApiKey()

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, mock: false, error: "SMS is not configured on the server." }
    }
    if (/^\d{6}$/.test(code)) return { ok: true, mock: true }
    return { ok: false, mock: true, error: "Incorrect code. Please try again." }
  }

  const msisdn = toBriqPhone(phone)
  const cleanedCode = code.replace(/\D/g, "")

  try {
    const res = await fetch(`${BRIQ_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: briqHeaders(apiKey),
      body: JSON.stringify({
        phone_number: msisdn,
        code: cleanedCode,
      }),
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

/** Safe status for ops debugging (no secrets). */
export function getBriqPublicStatus() {
  const key = getBriqApiKey()
  return {
    configured: Boolean(key),
    apiKeyLength: key?.length ?? 0,
    senderId: resolveSenderId(),
    baseUrl: BRIQ_BASE_URL,
  }
}
