import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { VerificationStatusBanner } from "@/components/dashboard/verification-status-banner"
import {
  DocumentUploadForm,
  IdentityVerificationForm,
} from "./verification-forms"
import { AlertTriangle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Verification · Link-Up" }

export default async function VerificationPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const profileRes = await admin
    .from("profiles")
    .select(
      "is_phone_verified, nida_verification_status, nida_number, date_of_birth, gender, region, district",
    )
    .eq("id", session.userId)
    .maybeSingle()

  const missingNidaColumns = Boolean(
    profileRes.error?.message?.includes("nida_") || profileRes.error?.code === "42703",
  )

  const { data: profile } = missingNidaColumns
    ? await admin
        .from("profiles")
        .select("is_phone_verified, nida_number, date_of_birth, gender, region, district")
        .eq("id", session.userId)
        .maybeSingle()
    : profileRes

  const { data: documents } = await admin
    .from("documents")
    .select("type, status, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })

  const docs = documents ?? []
  const nationalId = docs.find((d) => d.type === "national_id")
  const businessLicense = docs.find((d) => d.type === "business_license")
  const nidaStatus =
    ((profile as { nida_verification_status?: string } | null)?.nida_verification_status as
      | string
      | undefined) ?? "unverified"
  const identityLocked = nidaStatus === "verified" || nidaStatus === "pending_manual"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit your NIDA details and upload identity documents so you can apply for loans.
        </p>
      </div>

      {missingNidaColumns && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database migration required</AlertTitle>
          <AlertDescription>
            NIDA status columns are missing in Supabase. Open Supabase → SQL Editor, paste and run{" "}
            <code className="text-xs">migrations/002_nida_and_statements.sql</code>, then refresh
            this page and submit again.
          </AlertDescription>
        </Alert>
      )}

      <VerificationStatusBanner
        isPhoneVerified={Boolean(profile?.is_phone_verified ?? session.isPhoneVerified)}
        nidaStatus={nidaStatus}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">NIDA identity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Required before loan applications are unlocked.
              </p>
            </div>
            <Badge variant="outline" className="capitalize shrink-0">
              {nidaStatus.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="mt-6">
            <IdentityVerificationForm
              locked={identityLocked}
              initial={{
                dateOfBirth: profile?.date_of_birth
                  ? String(profile.date_of_birth).slice(0, 10)
                  : "",
                gender: (profile?.gender as string | undefined) ?? "",
                nidaNumber: (profile?.nida_number as string | undefined) ?? "",
                region: (profile?.region as string | undefined) ?? "",
                district: (profile?.district as string | undefined) ?? "",
              }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your National ID card photo and business license for admin review.
          </p>
          <div className="mt-6">
            <DocumentUploadForm
              nationalIdStatus={nationalId?.status}
              businessLicenseStatus={businessLicense?.status}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
