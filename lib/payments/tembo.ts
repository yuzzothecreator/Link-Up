import crypto from "crypto"

/**
 * TemboPlus adapter — real mobile-money collection via phone (USSD / STK push).
 *
 * Docs: https://tembo.gitbook.io/tembo
 * Endpoint: POST https://api.temboplus.com/tembo/v1/collection
 * Auth: x-account-id, x-secret-key, x-request-id
 *
 * If TEMBO_ACCOUNT_ID or TEMBO_SECRET_KEY is missing, falls back to mock mode.
 */

const TEMBO_BASE_URL =
  process.env.TEMBO_BASE_URL ?? "https://api.temboplus.com/tembo/v1"

export type MobileMoneyProvider = "mpesa" | "tigopesa" | "airtelmoney" | "halopesa" | string

export interface InitiatePaymentParams {
  reference: string
  amount: number
  phone: string // E.164: +255XXXXXXXXX
  provider?: MobileMoneyProvider | null
  narration?: string
}

export interface InitiatePaymentResult {
  ok: boolean
  mock: boolean
  providerRef?: string
  status?: string
  error?: string
}

export interface CollectionStatusResult {
  ok: boolean
  status: "completed" | "failed" | "pending"
  providerRef?: string
  rawStatus?: string
  error?: string
}

export function isMockMode() {
  return !process.env.TEMBO_ACCOUNT_ID || !process.env.TEMBO_SECRET_KEY
}

function temboHeaders() {
  return {
    "Content-Type": "application/json",
    "x-account-id": process.env.TEMBO_ACCOUNT_ID!,
    "x-secret-key": process.env.TEMBO_SECRET_KEY!,
    "x-request-id": crypto.randomUUID(),
  }
}

/** Map onboarded provider (or phone prefix) to a Tembo C2B channel. */
export function resolveChannel(phone: string, provider?: MobileMoneyProvider | null): string {
  const fromProvider: Record<string, string> = {
    mpesa: "TZ-VODACOM-C2B",
    tigopesa: "TZ-TIGO-C2B",
    airtelmoney: "TZ-AIRTEL-C2B",
    halopesa: "TZ-HALOTEL-C2B",
  }

  if (provider && fromProvider[provider]) return fromProvider[provider]

  const digits = phone.replace(/^\+/, "")
  if (digits.startsWith("25571") || digits.startsWith("25565") || digits.startsWith("25567")) {
    return "TZ-TIGO-C2B"
  }
  if (digits.startsWith("25578") || digits.startsWith("25568") || digits.startsWith("25569")) {
    return "TZ-AIRTEL-C2B"
  }
  if (digits.startsWith("25562")) return "TZ-HALOTEL-C2B"
  // Vodacom / M-Pesa prefixes: 25574, 25575, 25576, etc.
  return "TZ-VODACOM-C2B"
}

export function mapTemboStatus(
  statusCode: string | undefined,
): "completed" | "failed" | "pending" {
  if (statusCode === "PAYMENT_ACCEPTED") return "completed"
  if (
    statusCode === "PAYMENT_REJECTED" ||
    statusCode === "GENERIC_FAILURE" ||
    statusCode === "PROVIDER_FAILED" ||
    statusCode === "INSUFFICIENT_FUNDS"
  ) {
    return "failed"
  }
  return "pending"
}

export async function initiatePayment(
  params: InitiatePaymentParams,
): Promise<InitiatePaymentResult> {
  const accountId = process.env.TEMBO_ACCOUNT_ID
  const secretKey = process.env.TEMBO_SECRET_KEY

  if (!accountId || !secretKey) {
    console.log(
      `[trustLink][PAY MOCK] Initiate ${params.reference} amount=${params.amount} phone=${params.phone}`,
    )
    return { ok: true, mock: true, providerRef: `MOCK-${params.reference}` }
  }

  const phoneNumber = params.phone.replace(/^\+/, "")
  const amount = Math.round(params.amount)
  const channel = resolveChannel(params.phone, params.provider)
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/payments/webhook`

  try {
    const res = await fetch(`${TEMBO_BASE_URL}/collection`, {
      method: "POST",
      headers: temboHeaders(),
      body: JSON.stringify({
        channel,
        msisdn: phoneNumber,
        amount,
        transactionRef: params.reference,
        narration: params.narration ?? "trustLink deposit",
        transactionDate: new Date().toISOString(),
        callbackUrl,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error("[trustLink][PAY] Tembo error:", res.status, data)
      return {
        ok: false,
        mock: false,
        error:
          data?.message ??
          data?.reason ??
          (typeof data?.details === "object"
            ? JSON.stringify(data.details)
            : `Tembo responded with ${res.status}`),
      }
    }

    const mapped = mapTemboStatus(data?.statusCode)
    if (mapped === "failed") {
      return {
        ok: false,
        mock: false,
        providerRef: data?.transactionId,
        status: data?.statusCode,
        error: `Payment rejected by provider (${data?.statusCode ?? "unknown"})`,
      }
    }

    return {
      ok: true,
      mock: false,
      providerRef: data?.transactionId,
      status: data?.statusCode ?? "pending",
    }
  } catch (err) {
    console.error("[trustLink][PAY] Tembo request failed:", err)
    return { ok: false, mock: false, error: "Network error contacting Tembo Pay" }
  }
}

/** Poll Tembo for collection outcome (useful when webhooks cannot reach localhost). */
export async function getCollectionStatus(
  transactionId: string,
  transactionRef: string,
): Promise<CollectionStatusResult> {
  if (isMockMode()) {
    return { ok: true, status: "completed", providerRef: transactionId, rawStatus: "MOCK" }
  }

  try {
    const res = await fetch(`${TEMBO_BASE_URL}/collection/status`, {
      method: "POST",
      headers: temboHeaders(),
      body: JSON.stringify({ transactionId, transactionRef }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        status: "pending",
        error: data?.message ?? data?.reason ?? `Tembo status ${res.status}`,
      }
    }

    return {
      ok: true,
      status: mapTemboStatus(data?.statusCode),
      providerRef: data?.transactionId,
      rawStatus: data?.statusCode,
    }
  } catch (err) {
    console.error("[trustLink][PAY] Tembo status failed:", err)
    return { ok: false, status: "pending", error: "Network error contacting Tembo Pay" }
  }
}

export function generateReference() {
  return (
    "BT" +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(3).toString("hex").toUpperCase()
  )
}
