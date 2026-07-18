"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSession } from "@/lib/auth/session"

export async function markAsReadAction(id: string) {
  const session = await getSession()
  if (!session) return
  const admin = createAdminClient()
  await admin
    .from("notifications")
    .update({ status: "read" })
    .eq("id", id)
    .eq("user_id", session.userId)
  revalidatePath("/dashboard/notifications")
}
