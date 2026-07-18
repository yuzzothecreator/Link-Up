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

/**
 * Sends an SMS via Briq and records it in the notifications table.
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
    status: result.ok ? "sent" : "failed",
  })

  return result
}
