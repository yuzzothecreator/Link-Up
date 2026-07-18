import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { maskPhone } from "@/lib/format"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard · Link-Up",
}

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", session.userId)
    .single()

  return (
    <DashboardLayout
      user={{
        name: profile?.full_name ?? "User",
        phone: maskPhone(profile?.phone ?? session.phone),
        rawPhone: profile?.phone ?? session.phone,
        role: session.role,
        isPhoneVerified: session.isPhoneVerified,
      }}
    >
      {children}
    </DashboardLayout>
  )
}
