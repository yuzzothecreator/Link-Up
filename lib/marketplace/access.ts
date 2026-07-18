import { createAdminClient } from "@/lib/supabase/admin"
import { requireInstitutionMember } from "@/lib/auth/guards"

export const DISCLOSURE_SCOPES = [
  "identity.summary",
  "business.profile",
  "trust_score.summary",
  "trust_score.breakdown",
  "cashflow.aggregates",
  "cashflow.transactions",
  "wallet.summary",
  "loan_history",
  "assets.summary",
] as const

export type DisclosureScope = (typeof DISCLOSURE_SCOPES)[number]

export interface LenderApplicationAccess {
  actorId: string
  organizationId: string
  applicationId: string
  borrowerId: string
  scopes: DisclosureScope[]
  memberRole: string
}

/**
 * Object-level authorization for lender access. It validates live membership,
 * organization assignment and active, unexpired customer consent.
 */
export async function requireLenderApplicationAccess(
  applicationId: string,
  requiredScopes: DisclosureScope[] = [],
): Promise<LenderApplicationAccess> {
  const { session, membership } = await requireInstitutionMember()
  const admin = createAdminClient()

  const { data: application } = await admin
    .from("loan_applications")
    .select("id, borrower_id, organization_id")
    .eq("id", applicationId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle()

  if (!application) {
    throw new Error("Application not found or not assigned to your institution.")
  }

  const { data: consent } = await admin
    .from("customer_consents")
    .select("scopes, status, expires_at")
    .eq("application_id", applicationId)
    .eq("borrower_id", application.borrower_id)
    .eq("organization_id", membership.organizationId)
    .eq("status", "granted")
    .maybeSingle()

  const scopes = (consent?.scopes ?? []) as DisclosureScope[]
  const active =
    consent &&
    (!consent.expires_at || new Date(consent.expires_at).getTime() > Date.now())

  if (!active || requiredScopes.some((scope) => !scopes.includes(scope))) {
    await admin.from("data_access_audit").insert({
      actor_profile_id: session.userId,
      organization_id: membership.organizationId,
      borrower_id: application.borrower_id,
      application_id: applicationId,
      action: "application.access_denied",
      scopes: requiredScopes,
      resource_type: "loan_application",
      resource_id: applicationId,
      success: false,
    })
    throw new Error("Customer consent is missing, expired, or does not include this data.")
  }

  return {
    actorId: session.userId,
    organizationId: membership.organizationId,
    applicationId,
    borrowerId: application.borrower_id,
    scopes,
    memberRole: membership.memberRole,
  }
}

export async function auditDataAccess(
  access: LenderApplicationAccess,
  action: string,
  scopes: DisclosureScope[],
  resourceType: string,
) {
  const admin = createAdminClient()
  await admin.from("data_access_audit").insert({
    actor_profile_id: access.actorId,
    organization_id: access.organizationId,
    borrower_id: access.borrowerId,
    application_id: access.applicationId,
    action,
    scopes,
    resource_type: resourceType,
    resource_id: access.applicationId,
    success: true,
  })
}
