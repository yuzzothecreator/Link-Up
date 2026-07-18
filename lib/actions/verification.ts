"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireOnboarded } from "@/lib/auth/guards"
import { recalculateTrustScore } from "@/lib/trust/engine"
import { verifyNidaIdentity } from "@/lib/identity/nida"
import { uploadKycFile } from "@/lib/kyc/upload"
import type { ActionState } from "@/lib/actions/auth"

function revalidateVerification() {
  revalidatePath("/dashboard/verification")
  revalidatePath("/dashboard/profile")
  revalidatePath("/dashboard/loans")
  revalidatePath("/dashboard")
}

/** Submit / resubmit NIDA identity details from the dashboard. */
export async function submitIdentityVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("profiles")
    .select("nida_verification_status, full_name")
    .eq("id", session.userId)
    .single()

  if (existing?.nida_verification_status === "verified") {
    return { error: "Your NIDA is already verified. No further action is needed." }
  }

  if (existing?.nida_verification_status === "pending_manual") {
    return {
      error:
        "Your NIDA is already under admin review. You will be notified when it is approved or rejected.",
    }
  }

  const dateOfBirth = String(formData.get("dateOfBirth") ?? "")
  const gender = String(formData.get("gender") ?? "")
  const nidaNumber = String(formData.get("nidaNumber") ?? "")
  const region = String(formData.get("region") ?? "")
  const district = String(formData.get("district") ?? "")

  if (!dateOfBirth || !gender || !nidaNumber || !region) {
    return { error: "Please fill in all required fields." }
  }

  const nida = await verifyNidaIdentity({
    nidaNumber,
    dateOfBirth,
    fullName: existing?.full_name,
  })

  if (!nida.ok || !nida.normalized) {
    return { error: nida.error ?? "Invalid NIDA number." }
  }

  const { data: taken, error: takenError } = await admin
    .from("profiles")
    .select("id")
    .eq("nida_normalized", nida.normalized)
    .neq("id", session.userId)
    .maybeSingle()

  if (!takenError && taken) {
    return { error: "This NIDA number is already registered to another account." }
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
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", session.userId)
  if (error) return { error: "Could not save your identity details. Try again." }

  await recalculateTrustScore(session.userId)
  revalidateVerification()

  if (nida.status === "verified") {
    return {
      success: true,
      message: "NIDA verified. You can now apply for loans.",
    }
  }

  return {
    success: true,
    message:
      "Identity submitted for admin review. You will get an SMS and in-app notification when approved.",
  }
}

async function upsertDocument(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  type: "national_id" | "business_license",
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await admin
    .from("documents")
    .select("id, status")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.status === "approved") {
    return {
      ok: false,
      error: `${type === "national_id" ? "National ID" : "Business license"} is already approved.`,
    }
  }

  const uploaded = await uploadKycFile(admin, userId, file, type)
  if (!uploaded.ok) return uploaded

  if (existing?.id) {
    const { error } = await admin
      .from("documents")
      .update({
        reference: uploaded.path,
        status: "pending",
        verified_at: null,
      })
      .eq("id", existing.id)
    if (error) return { ok: false, error: "Could not update document. Try again." }
  } else {
    const { error } = await admin.from("documents").insert({
      user_id: userId,
      type,
      reference: uploaded.path,
      status: "pending",
    })
    if (error) return { ok: false, error: "Could not save document. Try again." }
  }

  return { ok: true }
}

/** Upload or replace National ID / Business License from the dashboard. */
export async function uploadVerificationDocumentsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const nationalId = formData.get("nationalId")
  const businessLicense = formData.get("businessLicense")

  const hasNational = nationalId instanceof File && nationalId.size > 0
  const hasLicense = businessLicense instanceof File && businessLicense.size > 0

  if (!hasNational && !hasLicense) {
    return { error: "Choose at least one document to upload." }
  }

  if (hasNational) {
    const result = await upsertDocument(admin, session.userId, "national_id", nationalId)
    if (!result.ok) return { error: result.error }
  }

  if (hasLicense) {
    const result = await upsertDocument(admin, session.userId, "business_license", businessLicense)
    if (!result.ok) return { error: result.error }
  }

  await recalculateTrustScore(session.userId)
  revalidateVerification()

  return {
    success: true,
    message:
      "Documents uploaded and sent for admin review. You will be notified when they are approved.",
  }
}
