import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { maskPhone } from "@/lib/format"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

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
    .select("full_name, phone, role, is_phone_verified")
    .eq("id", session.userId)
    .single()

  if (profile?.role === "lender") redirect("/lender")

  return (
    <DashboardLayout
      user={{
        name: profile?.full_name ?? "User",
        phone: maskPhone(profile?.phone ?? session.phone),
        rawPhone: profile?.phone ?? session.phone,
        role: profile?.role ?? session.role,
        isPhoneVerified: profile?.is_phone_verified ?? session.isPhoneVerified,
      }}
    >
      {children}
    </DashboardLayout>
  )
}
