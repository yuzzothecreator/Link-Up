import Link from "next/link"
import { requireInstitutionMember } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, FileCheck, HandCoins, PackageOpen } from "lucide-react"

export default async function LenderOverviewPage() {
  const { membership } = await requireInstitutionMember()
  const admin = createAdminClient()

  const [{ count: submitted }, { count: offered }, { count: accepted }, { count: products }] =
    await Promise.all([
      admin
        .from("loan_applications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId)
        .in("status", ["submitted", "under_review"]),
      admin
        .from("loan_applications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId)
        .eq("status", "offered"),
      admin
        .from("loan_applications")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId)
        .in("status", ["accepted", "funded"]),
      admin
        .from("loan_products")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId)
        .eq("status", "active"),
    ])

  const metrics = [
    { label: "Awaiting review", value: submitted ?? 0, icon: Clock },
    { label: "Offers outstanding", value: offered ?? 0, icon: HandCoins },
    { label: "Accepted / funded", value: accepted ?? 0, icon: FileCheck },
    { label: "Active products", value: products ?? 0, icon: PackageOpen },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{membership.organizationName}</h1>
        <p className="text-sm text-muted-foreground">
          Consent-controlled underwriting workspace · {membership.memberRole.replace("_", " ")}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Underwriting safeguards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Reviewers only see applications assigned to this institution.</p>
          <p>• Customer data is filtered by explicit application-level consent scopes.</p>
          <p>• Every disclosure view is recorded in an append-only access audit.</p>
          <p>• Full NIDA, bank account, and mobile-money identifiers are never disclosed.</p>
          <Button className="mt-3" asChild>
            <Link href="/lender/applications">Review applications</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
