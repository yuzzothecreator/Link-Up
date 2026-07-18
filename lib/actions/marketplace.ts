"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireBorrower } from "@/lib/auth/guards"
import { requireLenderApplicationAccess } from "@/lib/marketplace/access"
import { marketplaceApplicationSchema, lenderOfferSchema } from "@/lib/validation"
import type { ActionState } from "@/lib/actions/auth"

export async function submitMarketplaceApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireBorrower()
  const parsed = marketplaceApplicationSchema.safeParse({
    productId: formData.get("productId"),
    amount: formData.get("amount"),
    termDays: formData.get("termDays"),
    purpose: formData.get("purpose"),
    groupId: formData.get("groupId"),
    shareIdentity: formData.get("shareIdentity"),
    shareTrustScore: formData.get("shareTrustScore"),
    shareCashflow: formData.get("shareCashflow"),
    shareTransactions: formData.get("shareTransactions") ?? undefined,
    shareWallet: formData.get("shareWallet") ?? undefined,
    shareAssets: formData.get("shareAssets") ?? undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid application." }
  }

  const admin = createAdminClient()
  const [{ data: profile }, { data: product }, { data: trustScore }] = await Promise.all([
    admin
      .from("profiles")
      .select("role, is_phone_verified, nida_verification_status")
      .eq("id", session.userId)
      .single(),
    admin
      .from("loan_products")
      .select(`
        id, organization_id, min_amount, max_amount, min_term_days,
        max_term_days, required_trust_score, required_scopes, status,
        provider_organizations:organization_id (status)
      `)
      .eq("id", parsed.data.productId)
      .maybeSingle(),
    admin
      .from("trust_scores")
      .select("score, risk_level")
      .eq("user_id", session.userId)
      .maybeSingle(),
  ])

  if (
    profile?.role !== "borrower" ||
    !profile.is_phone_verified ||
    profile.nida_verification_status !== "verified"
  ) {
    return {
      error: "Phone verification and approved NIDA identity are required before applying.",
    }
  }

  const organization = product?.provider_organizations as unknown as { status: string } | null
  if (!product || product.status !== "active" || organization?.status !== "active") {
    return { error: "This loan product is currently unavailable." }
  }
  if (
    parsed.data.amount < Number(product.min_amount) ||
    parsed.data.amount > Number(product.max_amount)
  ) {
    return {
      error: `Amount must be between TZS ${Number(product.min_amount).toLocaleString()} and TZS ${Number(product.max_amount).toLocaleString()}.`,
    }
  }
  if (
    parsed.data.termDays < product.min_term_days ||
    parsed.data.termDays > product.max_term_days
  ) {
    return {
      error: `Term must be between ${product.min_term_days} and ${product.max_term_days} days.`,
    }
  }
  if ((trustScore?.score ?? 0) < product.required_trust_score) {
    return {
      error: `This provider requires a Trust Score of at least ${product.required_trust_score}.`,
    }
  }

  if (parsed.data.groupId) {
    const { data: membership } = await admin
      .from("group_members")
      .select("id")
      .eq("group_id", parsed.data.groupId)
      .eq("user_id", session.userId)
      .eq("status", "active")
      .maybeSingle()
    if (!membership) return { error: "You are not an active member of this group." }
  }

  const scopes = [
    "identity.summary",
    "business.profile",
    "trust_score.summary",
    "trust_score.breakdown",
    "cashflow.aggregates",
    "loan_history",
    ...(parsed.data.shareTransactions ? ["cashflow.transactions"] : []),
    ...(parsed.data.shareWallet ? ["wallet.summary"] : []),
    ...(parsed.data.shareAssets ? ["assets.summary"] : []),
  ]
  const missingRequired = ((product.required_scopes ?? []) as string[]).filter(
    (scope) => !scopes.includes(scope),
  )
  if (missingRequired.length) {
    return { error: `Provider requires consent for: ${missingRequired.join(", ")}.` }
  }

  const { data: application, error } = await admin
    .from("loan_applications")
    .insert({
      borrower_id: session.userId,
      organization_id: product.organization_id,
      product_id: product.id,
      group_id: parsed.data.groupId || null,
      amount: parsed.data.amount,
      term_days: parsed.data.termDays,
      purpose: parsed.data.purpose,
      status: "submitted",
      trust_score_snapshot: trustScore?.score ?? 0,
      risk_level_snapshot: trustScore?.risk_level ?? "unknown",
    })
    .select("id")
    .single()

  if (error || !application) {
    console.error("[marketplace] application insert failed", error)
    return { error: "Could not submit the application. Ensure migration 003 is installed." }
  }

  const { error: consentError } = await admin.from("customer_consents").insert({
    borrower_id: session.userId,
    organization_id: product.organization_id,
    application_id: application.id,
    scopes,
    purpose: "Assess this loan application and prepare an offer",
    status: "granted",
    evidence: {
      channel: "web",
      consent_version: "2026-07-18",
      explicit: true,
    },
  })

  if (consentError) {
    await admin.from("loan_applications").delete().eq("id", application.id)
    return { error: "Could not record your consent. Application was not shared." }
  }

  await admin.from("data_access_audit").insert({
    actor_profile_id: session.userId,
    organization_id: product.organization_id,
    borrower_id: session.userId,
    application_id: application.id,
    action: "consent.granted",
    scopes,
    resource_type: "customer_consent",
    resource_id: application.id,
  })

  revalidatePath("/dashboard/loans")
  return {
    success: true,
    message: "Application shared securely with the selected provider for review.",
  }
}

export async function revokeApplicationConsentAction(applicationId: string): Promise<ActionState> {
  const session = await requireBorrower()
  const admin = createAdminClient()

  const { data: application } = await admin
    .from("loan_applications")
    .select("id, organization_id, status")
    .eq("id", applicationId)
    .eq("borrower_id", session.userId)
    .maybeSingle()
  if (!application) return { error: "Application not found." }
  if (["accepted", "funded"].includes(application.status)) {
    return { error: "Consent cannot be revoked after accepting/funding without closing the facility." }
  }

  await admin
    .from("customer_consents")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .eq("borrower_id", session.userId)

  await admin
    .from("loan_applications")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("borrower_id", session.userId)

  await admin.from("data_access_audit").insert({
    actor_profile_id: session.userId,
    organization_id: application.organization_id,
    borrower_id: session.userId,
    application_id: applicationId,
    action: "consent.revoked",
    resource_type: "customer_consent",
    resource_id: applicationId,
  })

  revalidatePath("/dashboard/loans")
  return { success: true, message: "Consent revoked and application withdrawn." }
}

export async function createLenderOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = lenderOfferSchema.safeParse({
    applicationId: formData.get("applicationId"),
    amount: formData.get("amount"),
    termDays: formData.get("termDays"),
    interestRate: formData.get("interestRate"),
    fees: formData.get("fees") || 0,
    conditions: formData.get("conditions") || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid offer." }
  }

  const access = await requireLenderApplicationAccess(parsed.data.applicationId, [
    "identity.summary",
    "trust_score.summary",
    "cashflow.aggregates",
    "loan_history",
  ])
  if (!["organization_admin", "underwriter"].includes(access.memberRole)) {
    return { error: "Your institution role cannot create offers." }
  }

  const admin = createAdminClient()
  const { data: application } = await admin
    .from("loan_applications")
    .select("status")
    .eq("id", parsed.data.applicationId)
    .eq("organization_id", access.organizationId)
    .maybeSingle()
  if (!application || !["submitted", "under_review"].includes(application.status)) {
    return { error: "This application is not available for a new offer." }
  }

  const interest = Math.round(
    (parsed.data.amount * parsed.data.interestRate * parsed.data.termDays) /
      (365 * 100),
  )
  const totalRepayment = parsed.data.amount + interest + parsed.data.fees

  const { error } = await admin.from("lender_offers").insert({
    application_id: parsed.data.applicationId,
    organization_id: access.organizationId,
    created_by: access.actorId,
    amount: parsed.data.amount,
    term_days: parsed.data.termDays,
    interest_rate: parsed.data.interestRate,
    fees: parsed.data.fees,
    total_repayment: totalRepayment,
    conditions: parsed.data.conditions ?? null,
  })
  if (error) return { error: "Could not create offer." }

  await admin
    .from("loan_applications")
    .update({
      status: "offered",
      decided_by: access.actorId,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.applicationId)
    .eq("organization_id", access.organizationId)

  await admin.from("notifications").insert({
    user_id: access.borrowerId,
    channel: "in_app",
    type: "loan_offer",
    message: "A lender has prepared a loan offer for your review.",
    status: "unread",
  })

  revalidatePath(`/lender/applications/${parsed.data.applicationId}`)
  return { success: true, message: "Offer sent to the customer." }
}

export async function rejectMarketplaceApplicationAction(
  applicationId: string,
  reason: string,
): Promise<ActionState> {
  const access = await requireLenderApplicationAccess(applicationId, [
    "identity.summary",
    "trust_score.summary",
  ])
  if (!["organization_admin", "underwriter"].includes(access.memberRole)) {
    return { error: "Your institution role cannot make decisions." }
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("loan_applications")
    .update({
      status: "rejected",
      decided_by: access.actorId,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("organization_id", access.organizationId)
    .in("status", ["submitted", "under_review"])
    .select("id")
    .maybeSingle()
  if (!data) return { error: "Application already decided or unavailable." }

  await admin.from("notifications").insert({
    user_id: access.borrowerId,
    channel: "in_app",
    type: "loan_rejected",
    message: `Application was not approved. ${reason.slice(0, 300)}`,
    status: "unread",
  })
  revalidatePath("/lender/applications")
  return { success: true, message: "Application rejected." }
}

export async function acceptLenderOfferAction(offerId: string): Promise<ActionState> {
  const session = await requireBorrower()
  const admin = createAdminClient()

  const { data: offer } = await admin
    .from("lender_offers")
    .select(`
      id, application_id, organization_id, amount, term_days, interest_rate,
      total_repayment, status, expires_at,
      loan_applications:application_id (
        borrower_id, product_id, purpose, group_id, status
      )
    `)
    .eq("id", offerId)
    .eq("status", "pending")
    .maybeSingle()

  const application = offer?.loan_applications as unknown as {
    borrower_id: string
    product_id: string
    purpose: string
    group_id: string | null
    status: string
  } | null
  if (
    !offer ||
    !application ||
    application.borrower_id !== session.userId ||
    new Date(offer.expires_at).getTime() <= Date.now()
  ) {
    return { error: "Offer not found, expired, or unavailable." }
  }

  const interestAmount = Number(offer.total_repayment) - Number(offer.amount)
  const { data: accepted, error } = await admin
    .from("lender_offers")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()
  if (error || !accepted) return { error: "Offer has already been processed." }

  await admin
    .from("loan_applications")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", offer.application_id)
    .eq("borrower_id", session.userId)

  await admin.from("loans").insert({
    borrower_id: session.userId,
    application_id: offer.application_id,
    organization_id: offer.organization_id,
    product_id: application.product_id,
    amount: offer.amount,
    term_days: offer.term_days,
    purpose: application.purpose,
    group_id: application.group_id,
    interest_rate: offer.interest_rate,
    interest_amount: interestAmount,
    total_repayment: offer.total_repayment,
    amount_repaid: 0,
    // External provider must confirm disbursement before this becomes active.
    status: "approved",
  })

  await admin
    .from("lender_offers")
    .update({ status: "declined" })
    .eq("application_id", offer.application_id)
    .neq("id", offerId)
    .eq("status", "pending")

  revalidatePath("/dashboard/loans")
  return {
    success: true,
    message: "Offer accepted. The provider will complete final checks and disbursement.",
  }
}
