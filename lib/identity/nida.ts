/**
 * Tanzanian NIDA (National ID) verification helpers.
 *
 * Official NIDA CIG access requires stakeholder onboarding with NIDA.
 * This module:
 *  1. Strictly validates NIN structure (20 digits, DOB-encoded prefix)
 *  2. Cross-checks declared date of birth against the NIN
 *  3. Optionally calls an external gateway when NIDA_API_URL + NIDA_API_KEY are set
 *     (e.g. Zima NIDA Gate or your approved CIG proxy)
 */

export type NidaVerificationStatus =
  | "unverified"
  | "format_valid"
  | "pending_manual"
  | "verified"
  | "rejected"

export interface NidaParseResult {
  ok: true
  normalized: string // 20 digits, no dashes
  formatted: string // YYYYMMDD-XXXXX-XXXXX-XX
  birthDate: string // YYYY-MM-DD extracted from NIN
}

export interface NidaVerifyResult {
  ok: boolean
  status: NidaVerificationStatus
  normalized?: string
  formatted?: string
  error?: string
  provider?: "structural" | "external"
  providerRef?: string
}

/** Strip to digits only. */
export function normalizeNida(input: string): string {
  return input.replace(/\D/g, "")
}

export function formatNida(digits: string): string {
  const d = normalizeNida(digits)
  if (d.length !== 20) return d
  return `${d.slice(0, 8)}-${d.slice(8, 13)}-${d.slice(13, 18)}-${d.slice(18, 20)}`
}

function isValidCalendarDate(yyyy: number, mm: number, dd: number): boolean {
  if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false
  if (mm < 1 || mm > 12) return false
  if (dd < 1 || dd > 31) return false
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd))
  return (
    dt.getUTCFullYear() === yyyy &&
    dt.getUTCMonth() === mm - 1 &&
    dt.getUTCDate() === dd
  )
}

/**
 * Parse and structurally validate a Tanzanian NIN.
 * Format: YYYYMMDD + 5 + 5 + 2 = 20 digits.
 */
export function parseNida(input: string): NidaParseResult | { ok: false; error: string } {
  const normalized = normalizeNida(input)
  if (normalized.length !== 20) {
    return {
      ok: false,
      error: "NIDA number must be exactly 20 digits (e.g. 19900101-12345-12345-12).",
    }
  }

  const yyyy = Number(normalized.slice(0, 4))
  const mm = Number(normalized.slice(4, 6))
  const dd = Number(normalized.slice(6, 8))

  if (!isValidCalendarDate(yyyy, mm, dd)) {
    return {
      ok: false,
      error: "NIDA number has an invalid date of birth prefix. Check the first 8 digits.",
    }
  }

  // Reject obviously fake sequential / repeated pads (common spoofing)
  const serial = normalized.slice(8)
  if (/^0+$/.test(serial) || /^1+$/.test(serial) || /^(\d)\1{11}$/.test(serial)) {
    return {
      ok: false,
      error: "This NIDA number looks invalid. Enter the number from your National ID card.",
    }
  }

  const birthDate = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`

  return {
    ok: true,
    normalized,
    formatted: formatNida(normalized),
    birthDate,
  }
}

/** Compare YYYY-MM-DD values (tolerates time suffixes). */
export function datesMatch(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

/**
 * Full verification: structural checks + optional live NIDA gateway.
 */
export async function verifyNidaIdentity(params: {
  nidaNumber: string
  dateOfBirth: string
  fullName?: string | null
}): Promise<NidaVerifyResult> {
  const parsed = parseNida(params.nidaNumber)
  if (!parsed.ok) {
    return { ok: false, status: "rejected", error: parsed.error, provider: "structural" }
  }

  if (!datesMatch(parsed.birthDate, params.dateOfBirth)) {
    return {
      ok: false,
      status: "rejected",
      error:
        "Date of birth does not match the NIDA number. The first 8 digits of your NIDA must match your birth date (YYYYMMDD).",
      provider: "structural",
      normalized: parsed.normalized,
      formatted: parsed.formatted,
    }
  }

  // Age sanity (must be 18+)
  const dob = new Date(parsed.birthDate + "T00:00:00Z")
  const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (ageYears < 18) {
    return {
      ok: false,
      status: "rejected",
      error: "You must be at least 18 years old to register.",
      provider: "structural",
    }
  }

  const apiUrl = process.env.NIDA_API_URL
  const apiKey = process.env.NIDA_API_KEY

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          nin: parsed.normalized,
          date_of_birth: parsed.birthDate,
          full_name: params.fullName ?? undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const matched =
        res.ok &&
        (data?.verified === true ||
          data?.success === true ||
          data?.status === "verified" ||
          data?.data?.verified === true)

      if (matched) {
        return {
          ok: true,
          status: "verified",
          normalized: parsed.normalized,
          formatted: parsed.formatted,
          provider: "external",
          providerRef: data?.reference ?? data?.id ?? data?.data?.reference,
        }
      }

      return {
        ok: false,
        status: "rejected",
        error:
          data?.message ??
          data?.error ??
          "NIDA registry could not verify this number. Check the details and try again.",
        provider: "external",
        normalized: parsed.normalized,
        formatted: parsed.formatted,
      }
    } catch (err) {
      console.error("[NIDA] External verification failed:", err)
      // Fall through to structural + manual review rather than blocking onboarding.
    }
  }

  // Structural pass — queue for manual/admin confirmation until CIG credentials exist.
  return {
    ok: true,
    status: "pending_manual",
    normalized: parsed.normalized,
    formatted: parsed.formatted,
    provider: "structural",
  }
}

export function maskNida(nida: string | null | undefined): string {
  if (!nida) return "—"
  const d = normalizeNida(nida)
  if (d.length < 8) return "••••"
  return `${d.slice(0, 8)}-•••••-•••••-${d.slice(-2)}`
}
