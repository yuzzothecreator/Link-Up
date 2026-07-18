import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatTZS, maskPhone } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { verifyAssetAction, rejectAssetAction } from "@/lib/actions/admin"
import Link from "next/link"
import { ArrowLeft, ExternalLink, CheckCircle, XCircle } from "lucide-react"

export default async function UserDetailsPage({ params }: { params: { id: string } }) {
  await requireRole("admin")
  const admin = createAdminClient()

  // Fetch all user details
  const { data: user } = await admin
    .from("profiles")
    .select(`
      *,
      business_profiles(*),
      financial_profiles(*),
      trust_scores(*),
      assets(*),
      financial_records(*),
      loans(*)
    `)
    .eq("id", params.id)
    .single()

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">User not found</div>
  }

  const score = user.trust_scores?.[0]?.score ?? "N/A"
  const business = user.business_profiles?.[0]
  const financial = user.financial_profiles?.[0]
  const assets = user.assets ?? []
  const loans = user.loans ?? []

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">User ID: {user.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trust Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${score >= 700 ? "text-emerald-600" : score >= 400 ? "text-amber-600" : "text-red-600"}`}>
              {score}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{user.phone}</div>
            <div className="text-sm text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="capitalize text-lg">{user.role}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>KYC & Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Business Details</h3>
              {business ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Type:</span> {business.business_type}</div>
                  <div><span className="font-medium">Location:</span> {business.location}</div>
                  <div><span className="font-medium">Daily Income:</span> {formatTZS(business.daily_income)}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No business profile.</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 mt-4">Financial Settings</h3>
              {financial ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Provider:</span> {financial.mobile_money_provider}</div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No financial profile.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Declared Assets</CardTitle>
            <CardDescription>Verify collateral to boost the user's score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assets.length > 0 ? (
                assets.map((asset: any) => (
                  <div key={asset.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{asset.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{asset.type.replace("_", " ")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatTZS(asset.estimated_value)}</p>
                        <Badge variant="outline" className={
                          asset.status === "verified" ? "text-green-600 border-green-200 bg-green-50" :
                          asset.status === "rejected" ? "text-red-600 border-red-200 bg-red-50" :
                          "text-amber-600 border-amber-200 bg-amber-50"
                        }>
                          {asset.status}
                        </Badge>
                      </div>
                    </div>
                    {asset.proof_document_url && (
                      <a href={asset.proof_document_url} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> View Proof Document
                      </a>
                    )}
                    {asset.status === "pending_verification" && (
                      <div className="flex items-center gap-2 pt-2 border-t mt-2">
                        <form action={async () => {
                          "use server"
                          await verifyAssetAction(asset.id, user.id)
                        }}>
                          <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                            <CheckCircle className="w-4 h-4 mr-1" /> Verify
                          </Button>
                        </form>
                        <form action={async () => {
                          "use server"
                          await rejectAssetAction(asset.id)
                        }}>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No assets declared.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loans.map((loan: any) => (
                  <tr key={loan.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{formatTZS(loan.amount)}</td>
                    <td className="px-4 py-3">{loan.term_days} days</td>
                    <td className="px-4 py-3 capitalize">{loan.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(loan.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No loans found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
