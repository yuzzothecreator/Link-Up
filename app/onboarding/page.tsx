import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"

export default async function OnboardingIndex() {
  const session = await getSession()
  if (!session) redirect("/auth/login")
  if (session.onboardingComplete) redirect("/dashboard")
  redirect("/onboarding/kyc")
}
