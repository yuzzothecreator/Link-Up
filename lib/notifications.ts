import { createAdminClient } from "@/lib/supabase/admin"
import { sendSms } from "@/lib/sms/briq"

type NotificationType =
  | "otp"
  | "loan_application"
  | "loan_approved"
  | "loan_rejected"
  | "payment_confirmation"
  | "repayment_reminder"
  | "kyc_approved"
  | "kyc_rejected"

/**
 * Sends an SMS via Briq and records it in the notifications table.
 * When userId is set, the row is marked unread so it appears in Notifications Center.
 */
export async function notify(params: {
  userId?: string
  phone: string
  type: NotificationType
  message: string
}) {
  const { userId, phone, type, message } = params
  const result = await sendSms(phone, message)

  const admin = createAdminClient()
  await admin.from("notifications").insert({
    user_id: userId ?? null,
    channel: "sms",
    type,
    message,
    // Prefer inbox visibility for the customer; SMS delivery is still attempted above.
    status: userId ? "unread" : result.ok ? "sent" : "failed",
  })

  return result
}

/** Lookup phone and notify a customer about KYC / NIDA review outcome. */
export async function notifyVerificationOutcome(params: {
  userId: string
  approved: boolean
  message: string
}) {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", params.userId)
    .maybeSingle()

  if (!profile?.phone) return { ok: false as const, error: "No phone on profile" }

  return notify({
    userId: params.userId,
    phone: profile.phone,
    type: params.approved ? "kyc_approved" : "kyc_rejected",
    message: params.message,
  })
}
