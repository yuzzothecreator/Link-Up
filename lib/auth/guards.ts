import { redirect } from "next/navigation"
import { getSession, type Role, type SessionPayload } from "@/lib/auth/session"

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
  if (!roles.includes(session.role)) redirect("/dashboard")
  return session
}
