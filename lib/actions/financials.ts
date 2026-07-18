"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSession } from "@/lib/auth/guards"

export async function addFinancialRecordAction(formData: FormData) {
  const session = await requireSession()
  const recordType = formData.get("record_type") as string
  const category = formData.get("category") as string
  const amount = Number(formData.get("amount"))
  const description = formData.get("description") as string
  const recordDate = formData.get("record_date") as string

  if (!recordType || !category || isNaN(amount) || amount <= 0 || !recordDate) {
    return { error: "Please fill all required fields correctly." }
  }

  const admin = createAdminClient()
  const { error } = await admin.from("financial_records").insert({
    user_id: session.userId,
    record_type: recordType,
    category,
    amount,
    description: description || null,
    record_date: recordDate,
  })

  if (error) {
    console.error("Failed to add financial record:", error)
    return { error: "Failed to save record." }
  }

  revalidatePath("/dashboard/financials")
  return { success: true }
}
