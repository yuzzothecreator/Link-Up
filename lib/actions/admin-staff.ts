"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/guards"
import { normalizePhone } from "@/lib/validation"
import { isDemoPhone, upsertStaffAccount } from "@/lib/auth/staff"
import type { ActionState } from "@/lib/actions/auth"
import type { Role } from "@/lib/auth/session"

const ASSIGNABLE: Role[] = ["borrower", "lender", "admin"]

export async function assignExistingUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentAdmin = await requireRole("admin")
  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "") as Role
  const organizationId = String(formData.get("organizationId") ?? "")

  if (!userId) return { error: "User is required." }
  if (!ASSIGNABLE.includes(role)) return { error: "Invalid role." }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, phone, role")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) return { error: profileError.message }
  if (!profile) return { error: "User no longer exists." }
  if (profile.id === currentAdmin.userId && role !== "admin") {
    return { error: "You cannot remove your own admin access." }
  }

  if (profile.role === "admin" && role !== "admin") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
    if (countError) return { error: countError.message }
    if ((count ?? 0) <= 1) return { error: "The last admin cannot be reassigned." }
  }

  if (role === "lender") {
    if (!organizationId) return { error: "Select a lender organization." }

    const { data: organization, error: organizationError } = await admin
      .from("provider_organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("status", "active")
      .maybeSingle()
    if (organizationError) return { error: organizationError.message }
    if (!organization) return { error: "That lender organization is not active." }

    const { error: membershipError } = await admin.from("provider_members").upsert(
      {
        organization_id: organizationId,
        profile_id: userId,
        role: "underwriter",
        status: "active",
      },
      { onConflict: "organization_id,profile_id" },
    )
    if (membershipError) return { error: membershipError.message }

    const { error: oldMembershipError } = await admin
      .from("provider_members")
      .update({ status: "suspended" })
      .eq("profile_id", userId)
      .neq("organization_id", organizationId)
      .eq("status", "active")
    if (oldMembershipError) return { error: oldMembershipError.message }
  }

  const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", userId)
  if (roleError) return { error: roleError.message }

  if (role !== "lender") {
    const { error: membershipError } = await admin
      .from("provider_members")
      .update({ status: "suspended" })
      .eq("profile_id", userId)
      .eq("status", "active")
    if (membershipError) return { error: membershipError.message }
  }

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${userId}`)
  return {
    success: true,
    message: `${profile.phone} is now a ${role}. They must sign in again to refresh access.`,
  }
}

/**
 * Promote / change a user's platform role. Only platform admins.
 * Does not set passwords — access is always phone + Briq OTP.
 */
export async function setUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin")

  const phoneRaw = String(formData.get("phone") ?? "")
  const role = String(formData.get("role") ?? "") as Role
  const fullName = String(formData.get("fullName") ?? "").trim() || "Staff User"
  const organizationName = String(formData.get("organizationName") ?? "").trim()

  const phone = normalizePhone(phoneRaw)
  if (!phone) return { error: "Enter a valid Tanzanian phone number." }
  if (!ASSIGNABLE.includes(role)) return { error: "Invalid role." }
  if (process.env.NODE_ENV === "production" && isDemoPhone(phone)) {
    return { error: "Demo phone numbers cannot be used in production." }
  }

  if (role === "admin" || role === "lender") {
    const result = await upsertStaffAccount({
      phone,
      fullName,
      role,
      organizationName:
        role === "lender"
          ? organizationName || "Link-Up Partner Bank"
          : undefined,
    })
    if (!result.ok) return { error: result.error }
    revalidatePath("/admin/users")
    return {
      success: true,
      message: `${role} access granted for ${result.phone}. They must log in with Briq SMS OTP.`,
    }
  }

  // Demote / set borrower
  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle()
  if (!profile) return { error: "No account found for that phone. Ask them to register first." }

  const { error } = await admin
    .from("profiles")
    .update({ role: "borrower" })
    .eq("id", profile.id)
  if (error) return { error: error.message }

  revalidatePath("/admin/users")
  return { success: true, message: `Role set to borrower for ${phone}.` }
}
