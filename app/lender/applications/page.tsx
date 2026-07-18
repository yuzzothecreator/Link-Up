import Link from "next/link"
import { requireInstitutionMember } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatTZS } from "@/lib/format"

export default async function LenderApplicationsPage() {
  const { membership } = await requireInstitutionMember()
  const admin = createAdminClient()

  const { data } = await admin
    .from("loan_applications")
    .select(`
      id, amount, term_days, purpose, status, trust_score_snapshot,
      risk_level_snapshot, created_at,
      loan_products:product_id (name),
      profiles:borrower_id (full_name, region),
      customer_consents:customer_consents (status, expires_at, scopes)
    `)
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false })

  const applications = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loan applications</h1>
        <p className="text-sm text-muted-foreground">
          Only applications assigned to {membership.organizationName} are listed.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {applications.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No applications have been submitted to your institution.
          </p>
        ) : (
          <div className="divide-y">
            {applications.map((application) => {
              const borrower = application.profiles as unknown as {
                full_name: string | null
                region: string | null
              }
              const product = application.loan_products as unknown as { name: string }
              const consents = (application.customer_consents ?? []) as Array<{
                status: string
                expires_at: string
                scopes: string[]
              }>
              const consent = consents.find((item) => item.status === "granted")
              const consentActive =
                consent && new Date(consent.expires_at).getTime() > Date.now()
              return (
                <div
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{borrower?.full_name ?? "Applicant"}</p>
                      <Badge variant="outline" className="capitalize">
                        {application.status.replace("_", " ")}
                      </Badge>
                      <Badge variant={consentActive ? "secondary" : "destructive"}>
                        {consentActive ? "consent active" : "no active consent"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product?.name} · {borrower?.region ?? "Region unavailable"}
                    </p>
                    <p className="mt-2 text-sm">
                      {formatTZS(application.amount)} · {application.term_days} days · score{" "}
                      {application.trust_score_snapshot ?? 0}
                    </p>
                  </div>
                  <Button size="sm" asChild disabled={!consentActive}>
                    <Link href={`/lender/applications/${application.id}`}>Review securely</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
