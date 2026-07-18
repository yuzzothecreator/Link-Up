"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/guards"
import { normalizePhone } from "@/lib/validation"
import { isDemoPhone, upsertStaffAccount } from "@/lib/auth/staff"
import type { ActionState } from "@/lib/actions/auth"
import type { Role } from "@/lib/auth/session"

const ASSIGNABLE: Role[] = ["borrower", "lender", "admin"]

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
