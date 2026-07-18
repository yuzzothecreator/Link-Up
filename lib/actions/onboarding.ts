"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSession, createSession } from "@/lib/auth/session"
import { recalculateTrustScore } from "@/lib/trust/engine"
import { normalizePhone } from "@/lib/validation"
import { verifyNidaIdentity } from "@/lib/identity/nida"
import { uploadKycFile } from "@/lib/kyc/upload"
import type { ActionState } from "@/lib/actions/auth"

async function requireAuth() {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  return session
}

/** Step 1 — Save KYC with NIDA verification. */
export async function saveKycAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const dateOfBirth = formData.get("dateOfBirth") as string
  const gender = formData.get("gender") as string
  const nidaNumber = formData.get("nidaNumber") as string
  const region = formData.get("region") as string
  const district = formData.get("district") as string

  if (!dateOfBirth || !gender || !nidaNumber || !region) {
    return { error: "Please fill in all required fields." }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", session.userId)
    .single()

  const nida = await verifyNidaIdentity({
    nidaNumber,
    dateOfBirth,
    fullName: profile?.full_name,
  })

  if (!nida.ok || !nida.normalized) {
    return { error: nida.error ?? "Invalid NIDA number." }
  }

  // Prevent reusing another user's verified/pending NIDA
  const { data: taken, error: takenError } = await admin
    .from("profiles")
    .select("id")
    .eq("nida_normalized", nida.normalized)
    .neq("id", session.userId)
    .maybeSingle()

  if (!takenError && taken) {
    return { error: "This NIDA number is already registered to another account." }
  }

  // Fallback uniqueness on raw nida_number when normalized column is missing
  if (takenError?.message?.includes("nida_normalized")) {
    const { data: takenRaw } = await admin
      .from("profiles")
      .select("id")
      .eq("nida_number", nida.formatted ?? nida.normalized)
      .neq("id", session.userId)
      .maybeSingle()
    if (takenRaw) {
      return { error: "This NIDA number is already registered to another account." }
    }
  }

  const updates: Record<string, unknown> = {
    date_of_birth: dateOfBirth,
    gender,
    nida_number: nida.formatted ?? nida.normalized,
    nida_normalized: nida.normalized,
    nida_verification_status: nida.status,
    nida_provider_ref: nida.providerRef ?? null,
    nida_verified_at: nida.status === "verified" ? new Date().toISOString() : null,
    region,
    district: district || null,
    onboarding_step: "business",
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", session.userId)

  if (error) {
    // Columns may not exist yet — try minimal update then warn.
    if (error.message?.includes("nida_")) {
      const { error: fallbackError } = await admin
        .from("profiles")
        .update({
          date_of_birth: dateOfBirth,
          gender,
          nida_number: nida.formatted ?? nida.normalized,
          region,
          district: district || null,
          onboarding_step: "business",
        })
        .eq("id", session.userId)
      if (fallbackError) return { error: "Could not save your details. Try again." }
      console.warn(
        "[KYC] Run migrations/002_nida_and_statements.sql to enable full NIDA status storage.",
      )
    } else {
      return { error: "Could not save your details. Try again." }
    }
  }

  await recalculateTrustScore(session.userId)
  redirect("/onboarding/business")
}

/** Step 2 — Save business profile. */
export async function saveBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const businessName = formData.get("businessName") as string
  const businessType = formData.get("businessType") as string
  const location = formData.get("location") as string
  const yearsInOperation = formData.get("yearsInOperation") as string
  const dailyIncome = formData.get("dailyIncome") as string

  if (!businessType || !location) {
    return { error: "Please fill in all required fields." }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      business_name: businessName || null,
      business_type: businessType,
      business_location: location,
      years_in_operation: yearsInOperation ? Number(yearsInOperation) : null,
      daily_income: dailyIncome ? Number(dailyIncome) : null,
      onboarding_step: "financial",
    })
    .eq("id", session.userId)

  if (error) return { error: "Could not save your business details. Try again." }

  redirect("/onboarding/financial")
}

/** Step 3 — Save financial details. */
export async function saveFinancialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const mobileMoneyProvider = formData.get("mobileMoneyProvider") as string
  const mobileMoneyNumberRaw = formData.get("mobileMoneyNumber") as string
  const bankAccount = formData.get("bankAccount") as string

  if (!mobileMoneyProvider) {
    return { error: "Please select a mobile money provider." }
  }

  let mobileMoneyNumber: string | null = null
  if (mobileMoneyNumberRaw?.trim()) {
    mobileMoneyNumber = normalizePhone(mobileMoneyNumberRaw)
    if (!mobileMoneyNumber) {
      return { error: "Enter a valid mobile money phone number." }
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      mobile_money_provider: mobileMoneyProvider,
      mobile_money_number: mobileMoneyNumber,
      bank_account: bankAccount || null,
      onboarding_step: "documents",
    })
    .eq("id", session.userId)

  if (error) return { error: "Could not save your financial details. Try again." }

  redirect("/onboarding/documents")
}

/** Step 4 — Save documents and complete onboarding. */
export async function saveDocumentsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const nationalId = formData.get("nationalId")
  const businessLicense = formData.get("businessLicense")

  const docs: { user_id: string; type: string; reference: string; status: string }[] = []

  if (nationalId instanceof File && nationalId.size > 0) {
    const uploaded = await uploadKycFile(admin, session.userId, nationalId, "national_id")
    if (!uploaded.ok) return { error: uploaded.error }
    docs.push({
      user_id: session.userId,
      type: "national_id",
      reference: uploaded.path,
      status: "pending",
    })
  }

  if (businessLicense instanceof File && businessLicense.size > 0) {
    const uploaded = await uploadKycFile(admin, session.userId, businessLicense, "business_license")
    if (!uploaded.ok) return { error: uploaded.error }
    docs.push({
      user_id: session.userId,
      type: "business_license",
      reference: uploaded.path,
      status: "pending",
    })
  }

  if (docs.length > 0) {
    const { error: docError } = await admin.from("documents").insert(docs)
    if (docError) return { error: "Could not save documents. Try again." }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      onboarding_complete: true,
      onboarding_step: "complete",
    })
    .eq("id", session.userId)

  if (error) return { error: "Could not complete onboarding. Try again." }

  await recalculateTrustScore(session.userId)

  await createSession({
    ...session,
    onboardingComplete: true,
  })

  redirect("/dashboard")
}

/** Skip documents step but still complete onboarding. */
export async function skipDocumentsAction(): Promise<void> {
  const session = await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from("profiles")
    .update({
      onboarding_complete: true,
      onboarding_step: "complete",
    })
    .eq("id", session.userId)

  if (error) {
    throw new Error("Could not complete onboarding. Try again.")
  }

  await recalculateTrustScore(session.userId)

  await createSession({
    ...session,
    onboardingComplete: true,
  })

  redirect("/dashboard")
}
