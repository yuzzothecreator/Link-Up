"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { issueOtp, verifyOtp } from "@/lib/auth/otp"
import { createSession, destroySession, getSession, type Role } from "@/lib/auth/session"
import { recalculateTrustScore } from "@/lib/trust/engine"
import { registerSchema, loginSchema, verifyOtpSchema } from "@/lib/validation"

export interface ActionState {
  error?: string
  success?: boolean
  message?: string
  pending?: boolean
  reference?: string
}

/** Register: validate, ensure phone is new, create profile, log in immediately. */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" }
  }
  const { fullName, phone } = parsed.data

  const admin = createAdminClient()
  const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle()
  if (existing) {
    return { error: "An account with this phone already exists. Please log in." }
  }

  // Create profile immediately, unverified
  const { data: created, error } = await admin
    .from("profiles")
    .insert({ phone, full_name: fullName, role: "borrower", is_phone_verified: false })
    .select("id, phone, role, is_phone_verified, onboarding_complete, full_name")
    .single()

  if (error || !created) {
    console.error("Profile creation error:", error)
    return { error: "Could not create your account. Try again." }
  }

  // Provision a wallet + initial trust score for the new user.
  await admin.from("wallets").insert({ user_id: created.id, balance: 0 })
  await recalculateTrustScore(created.id)

  await createSession({
    userId: created.id,
    phone: created.phone,
    role: created.role as Role,
    isPhoneVerified: created.is_phone_verified,
    onboardingComplete: created.onboarding_complete,
  })

  redirect(created.onboarding_complete ? "/dashboard" : "/onboarding")
}

/** Login: validate, ensure phone exists, log in immediately. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ phone: formData.get("phone") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid phone number" }
  }
  const { phone } = parsed.data

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("profiles")
    .select("id, phone, role, is_phone_verified, onboarding_complete")
    .eq("phone", phone)
    .maybeSingle()

  if (!existing) {
    return { error: "No account found for this number. Please register first." }
  }

  await createSession({
    userId: existing.id,
    phone: existing.phone,
    role: existing.role as Role,
    isPhoneVerified: existing.is_phone_verified,
    onboardingComplete: existing.onboarding_complete,
  })

  redirect(existing.onboarding_complete ? "/dashboard" : "/onboarding")
}

/** Resend OTP for dashboard verification. */
export async function resendOtpAction(phone: string): Promise<ActionState> {
  const session = await getSession()
  if (!session || session.phone !== phone) {
    return { error: "Session mismatch. Please log in again." }
  }
  const result = await issueOtp(phone)
  if (!result.ok) return { error: result.error }
  return { success: true, message: "A new code has been sent to your phone via SMS." }
}

/** Verify OTP from dashboard */
export async function verifyDashboardOtpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code" }
  }
  const { phone, code } = parsed.data

  const result = await verifyOtp(phone, code)
  if (!result.ok) return { error: result.error }

  const session = await getSession()
  if (!session || session.phone !== phone) {
    return { error: "Session mismatch. Please log in again." }
  }

  const admin = createAdminClient()
  await admin.from("profiles").update({ is_phone_verified: true }).eq("id", session.userId)

  // Update session
  await createSession({
    ...session,
    isPhoneVerified: true,
  })

  return { success: true, message: "Phone verified successfully." }
}

export async function logoutAction() {
  await destroySession()
  redirect("/auth/login")
}
