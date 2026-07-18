"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSession } from "@/lib/auth/guards"

export async function addAssetAction(formData: FormData) {
  const session = await requireSession()
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const estimated_value = Number(formData.get("estimated_value"))
  const document_url = formData.get("document_url") as string

  if (!name || !type || isNaN(estimated_value) || estimated_value <= 0) {
    return { error: "Please provide valid asset details." }
  }

  const admin = createAdminClient()
  const { error } = await admin.from("assets").insert({
    user_id: session.userId,
    name,
    type,
    estimated_value,
    proof_document_url: document_url || null,
  })

  if (error) {
    console.error("Failed to add asset:", error)
    return { error: "Failed to declare asset." }
  }

  revalidatePath("/dashboard/assets")
  return { success: true }
}
