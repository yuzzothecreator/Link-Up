import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePhone } from "@/lib/validation"
import type { Role } from "@/lib/auth/session"

/** Known local demo phones — blocked in production even if present in the DB. */
export const DEMO_PHONES = new Set([
  "+255711111111",
  "+255722222222",
  "+255733333333",
])

export function isDemoPhone(phone: string) {
  return DEMO_PHONES.has(phone)
}

export function assertProductionSafePhone(phone: string): string | null {
  if (process.env.NODE_ENV === "production" && isDemoPhone(phone)) {
    return "This demo account is disabled in production. Use a real staff phone number."
  }
  return null
}

export interface StaffBootstrapInput {
  phone: string
  fullName: string
  role: Extract<Role, "admin" | "lender">
  organizationName?: string
}

/**
 * Upsert a privileged staff profile. Phone must be E.164 (+255…).
 * Login is always via real Briq OTP to that phone — never a shared password.
 */
export async function upsertStaffAccount(input: StaffBootstrapInput) {
  const phone = normalizePhone(input.phone)
  if (!phone) {
    return { ok: false as const, error: `Invalid phone: ${input.phone}` }
  }
  if (isDemoPhone(phone) && process.env.NODE_ENV === "production") {
    return { ok: false as const, error: "Cannot bootstrap demo phones in production." }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("phone", phone)
    .maybeSingle()

  let userId = existing?.id as string | undefined

  if (userId) {
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: input.fullName,
        role: input.role,
        is_phone_verified: true,
        onboarding_complete: true,
        onboarding_step: "complete",
      })
      .eq("id", userId)
    if (error) return { ok: false as const, error: error.message }
  } else {
    const { data: created, error } = await admin
      .from("profiles")
      .insert({
        phone,
        full_name: input.fullName,
        role: input.role,
        is_phone_verified: true,
        onboarding_complete: true,
        onboarding_step: "complete",
      })
      .select("id")
      .single()
    if (error || !created) {
      return { ok: false as const, error: error?.message ?? "Could not create profile" }
    }
    userId = created.id
    await admin.from("wallets").upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id" })
    await admin.from("trust_scores").upsert(
      {
        user_id: userId,
        score: 300,
        risk_level: "medium",
        breakdown: {
          savings: 30,
          documents: 30,
          repayment: 30,
          accountAge: 30,
          transactions: 30,
          identity: 40,
        },
      },
      { onConflict: "user_id" },
    )
  }

  if (input.role === "lender" && input.organizationName) {
    const { data: org } = await admin
      .from("provider_organizations")
      .select("id")
      .eq("name", input.organizationName)
      .maybeSingle()

    if (org?.id) {
      await admin.from("provider_members").upsert(
        {
          organization_id: org.id,
          profile_id: userId,
          role: "organization_admin",
          status: "active",
        },
        { onConflict: "organization_id,profile_id" },
      )
    }
  }

  return { ok: true as const, userId, phone, role: input.role }
}
