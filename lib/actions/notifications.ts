"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

export async function markAsReadAction(id: string) {
  const admin = createAdminClient()
  await admin.from("notifications").update({ status: "read" }).eq("id", id)
  revalidatePath("/dashboard/notifications")
}
