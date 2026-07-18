import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { ProfileForm } from "./profile-form"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Profile · Link-Up" }

export default async function ProfilePage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const [{ data: profile }, { data: documents }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", session.userId).single(),
    admin.from("documents").select("type, status").eq("user_id", session.userId),
  ])

  const docs = documents ?? []
  const hasNationalId = docs.some((d) => d.type === "national_id")
  const hasBusinessLicense = docs.some((d) => d.type === "business_license")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal and business details.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">General Information</h2>
          <div className="mt-6">
            <ProfileForm
              initialData={{
                fullName: profile?.full_name ?? "",
                businessName: profile?.business_name ?? "",
                businessLocation: profile?.business_location ?? "",
              }}
            />
          </div>
        </div>

        {/* Account Details & Documents */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground">Account Details</h2>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Phone Number</span>
                <span className="text-sm font-medium">{session.phone}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className="capitalize">{session.role}</Badge>
              </div>
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Mobile Money Provider</span>
                <span className="text-sm font-medium capitalize">{profile?.mobile_money_provider ?? "Not set"}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Phone verified</span>
                <Badge variant="outline">{session.isPhoneVerified ? "Yes" : "No"}</Badge>
              </div>
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">NIDA Number</span>
                <span className="text-sm font-medium">
                  {profile?.nida_number
                    ? `${String(profile.nida_number).slice(0, 8)}-•••••-•••••-${String(profile.nida_number).replace(/\D/g, "").slice(-2)}`
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">NIDA status</span>
                <Badge variant="outline" className="capitalize">
                  {(profile?.nida_verification_status as string | undefined)?.replace(/_/g, " ") ??
                    "unverified"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground">Document Status</h2>
            <p className="mt-1 text-sm text-muted-foreground">Uploaded documents that verify your identity.</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  {hasNationalId ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">National ID (NIDA)</span>
                </div>
                <Badge variant={hasNationalId ? "outline" : "secondary"}>
                  {hasNationalId ? "Uploaded" : "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="flex items-center gap-3">
                  {hasBusinessLicense ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">Business License</span>
                </div>
                <Badge variant={hasBusinessLicense ? "outline" : "secondary"}>
                  {hasBusinessLicense ? "Uploaded" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
