"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { issueOtp, verifyOtp } from "@/lib/auth/otp"
import { createSession, destroySession, getSession, type Role } from "@/lib/auth/session"
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password"
import { recalculateTrustScore } from "@/lib/trust/engine"
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from "@/lib/validation"

export interface ActionState {
  error?: string
  success?: boolean
  message?: string
  pending?: boolean
  reference?: string
  otpRequired?: boolean
  phone?: string
  fullName?: string
}

function postAuthPath(role: Role, onboardingComplete: boolean) {
  if (!onboardingComplete) return "/onboarding"
  if (role === "lender") return "/lender"
  if (role === "admin") return "/admin"
  return "/dashboard"
}

/**
 * Register: prove phone with OTP, then set password for future logins.
 */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" }
  }

  const { fullName, phone, password } = parsed.data
  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  const confirm = String(formData.get("confirmPassword") ?? "")
  if (confirm && confirm !== password) {
    return { error: "Passwords do not match." }
  }

  const code = String(formData.get("code") ?? "")
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("profiles")
    .select("id, phone, role, is_phone_verified, onboarding_complete, password_hash")
    .eq("phone", phone)
    .maybeSingle()

  if (existing?.is_phone_verified && existing.password_hash && !code) {
    return { error: "An account with this phone already exists. Please log in." }
  }

  if (!code) {
    let profile = existing
    if (!profile) {
      const { data: created, error } = await admin
        .from("profiles")
        .insert({ phone, full_name: fullName, role: "borrower", is_phone_verified: false })
        .select("id, phone, role, is_phone_verified, onboarding_complete, password_hash")
        .single()
      if (error || !created) {
        console.error("Profile creation error:", error)
        return { error: "Could not create your account. Try again." }
      }
      profile = created
      await admin.from("wallets").insert({ user_id: created.id, balance: 0 })
      await recalculateTrustScore(created.id)
    }

    const otp = await issueOtp(phone, fullName)
    if (!otp.ok) return { error: otp.error }
    return {
      success: true,
      otpRequired: true,
      phone,
      fullName,
      message: "Enter the SMS code to verify your phone, then you can log in with your password.",
    }
  }

  if (!existing) return { error: "Registration session expired. Start again." }
  if (existing.role !== "borrower") {
    return { error: "This account must use the secure login page." }
  }

  const verified = await verifyOtp(phone, code)
  if (!verified.ok) {
    return { error: verified.error, otpRequired: true, phone, fullName }
  }

  const passwordHash = await hashPassword(password)
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      is_phone_verified: true,
      full_name: fullName,
      password_hash: passwordHash,
    })
    .eq("id", existing.id)

  if (updateError) {
    console.error("[Auth] password save failed:", updateError)
    if (updateError.message?.includes("password_hash") || updateError.code === "PGRST204") {
      return {
        error:
          "Password column missing. Run migrations/005_password_auth.sql in Supabase, then try again.",
      }
    }
    return { error: "Could not save your password. Try again." }
  }

  await createSession({
    userId: existing.id,
    phone: existing.phone,
    role: existing.role as Role,
    isPhoneVerified: true,
    onboardingComplete: existing.onboarding_complete,
  })
  redirect(postAuthPath(existing.role as Role, existing.onboarding_complete))
}

/** Daily login: phone + password. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid phone or password" }
  }
  const { phone, password } = parsed.data

  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from("profiles")
    .select("id, phone, role, is_phone_verified, onboarding_complete, password_hash")
    .eq("phone", phone)
    .maybeSingle()

  if (error?.message?.includes("password_hash") || error?.code === "42703") {
    return {
      error:
        "Password login is not set up yet. Run migrations/005_password_auth.sql in Supabase.",
    }
  }

  if (!existing) {
    return { error: "No account found for this number. Please register first." }
  }

  if (!existing.password_hash) {
    return {
      error:
        "This account has no password yet. Use Forgot password to set one with an SMS code.",
      phone,
    }
  }

  const ok = await verifyPassword(password, existing.password_hash)
  if (!ok) {
    return { error: "Incorrect phone or password.", phone }
  }

  if (!existing.is_phone_verified) {
    await admin.from("profiles").update({ is_phone_verified: true }).eq("id", existing.id)
  }

  await createSession({
    userId: existing.id,
    phone: existing.phone,
    role: existing.role as Role,
    isPhoneVerified: true,
    onboardingComplete: existing.onboarding_complete,
  })

  redirect(postAuthPath(existing.role as Role, existing.onboarding_complete))
}

/**
 * Forgot / set password: SMS OTP then new password.
 */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const phoneOnly = String(formData.get("phone") ?? "")
  const code = String(formData.get("code") ?? "")
  const password = String(formData.get("password") ?? "")

  const { normalizePhone } = await import("@/lib/validation")
  const phone = normalizePhone(phoneOnly)
  if (!phone) return { error: "Enter a valid phone number." }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("profiles")
    .select("id, phone, role, onboarding_complete")
    .eq("phone", phone)
    .maybeSingle()

  if (!existing) {
    return { error: "No account found for this number." }
  }

  if (!code) {
    const otp = await issueOtp(phone)
    if (!otp.ok) return { error: otp.error }
    return {
      success: true,
      otpRequired: true,
      phone,
      message: "Enter the SMS code, then choose a new password.",
    }
  }

  const parsed = resetPasswordSchema.safeParse({ phone, password, code })
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid details",
      otpRequired: true,
      phone,
    }
  }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError, otpRequired: true, phone }

  const confirm = String(formData.get("confirmPassword") ?? "")
  if (confirm !== password) {
    return { error: "Passwords do not match.", otpRequired: true, phone }
  }

  const verified = await verifyOtp(phone, code)
  if (!verified.ok) {
    return { error: verified.error, otpRequired: true, phone }
  }

  const passwordHash = await hashPassword(password)
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      password_hash: passwordHash,
      is_phone_verified: true,
    })
    .eq("id", existing.id)

  if (updateError) {
    console.error("[Auth] reset password failed:", updateError)
    return {
      error:
        updateError.message?.includes("password_hash")
          ? "Run migrations/005_password_auth.sql in Supabase, then try again."
          : "Could not update password. Try again.",
      otpRequired: true,
      phone,
    }
  }

  await createSession({
    userId: existing.id,
    phone: existing.phone,
    role: existing.role as Role,
    isPhoneVerified: true,
    onboardingComplete: existing.onboarding_complete,
  })

  redirect(postAuthPath(existing.role as Role, existing.onboarding_complete))
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
export async function verifyDashboardOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
