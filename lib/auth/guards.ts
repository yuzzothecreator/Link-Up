import { redirect } from "next/navigation"
import { getSession, type Role, type SessionPayload } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

/** Require any authenticated session; redirect to login otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  return session
}

/** Require a completed onboarding; redirect to onboarding otherwise. */
export async function requireOnboarded(): Promise<SessionPayload> {
  const session = await requireSession()
  if (!session.onboardingComplete) redirect("/onboarding")
  return session
}

/** Require one of the given roles; redirect to dashboard otherwise. */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession()
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("phone, role, is_phone_verified, onboarding_complete")
    .eq("id", session.userId)
    .maybeSingle()

  if (!profile || !roles.includes(profile.role as Role)) redirect("/dashboard")

  // Use live database claims for every privileged operation. JWT claims are
  // navigation hints only and may be stale after a role is revoked.
  return {
    ...session,
    phone: profile.phone,
    role: profile.role as Role,
    isPhoneVerified: profile.is_phone_verified,
    onboardingComplete: profile.onboarding_complete,
  }
}

export async function requireBorrower(): Promise<SessionPayload> {
  return requireRole("borrower")
}

export interface InstitutionMembership {
  id: string
  organizationId: string
  organizationName: string
  organizationType: "bank" | "telecom" | "microfinance" | "sacco" | "fintech"
  memberRole: "organization_admin" | "underwriter" | "viewer" | "auditor"
}

/** Require a live, active lender membership—not only a profile role claim. */
export async function requireInstitutionMember(): Promise<{
  session: SessionPayload
  membership: InstitutionMembership
}> {
  const session = await requireRole("lender", "admin")
  const admin = createAdminClient()

  const { data } = await admin
    .from("provider_members")
    .select(`
      id,
      organization_id,
      role,
      provider_organizations:organization_id (
        name,
        provider_type,
        status
      )
    `)
    .eq("profile_id", session.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  const organization = data?.provider_organizations as unknown as {
    name: string
    provider_type: InstitutionMembership["organizationType"]
    status: string
  } | null

  if (!data || !organization || organization.status !== "active") {
    redirect("/dashboard")
  }

  return {
    session,
    membership: {
      id: data.id,
      organizationId: data.organization_id,
      organizationName: organization.name,
      organizationType: organization.provider_type,
      memberRole: data.role as InstitutionMembership["memberRole"],
    },
  }
}
