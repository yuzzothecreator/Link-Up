import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Complete your profile · trustLink",
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
