import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AddAssetForm } from "@/components/dashboard/add-asset-form"
import { formatTZS } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export default async function AssetsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: assets } = await admin
    .from("assets")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })

  const totalValue = assets?.reduce((acc, curr) => acc + Number(curr.estimated_value), 0) || 0
  const verifiedValue = assets?.filter(a => a.status === 'verified').reduce((acc, curr) => acc + Number(curr.estimated_value), 0) || 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
        <p className="text-muted-foreground">
          Declare collateral assets to boost your trust score and increase your maximum loan limit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Verified Collateral Value</CardDescription>
            <CardTitle className="text-3xl text-primary">{formatTZS(verifiedValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Assets that have been verified and approved.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Declared Value</CardDescription>
            <CardTitle className="text-3xl">{formatTZS(totalValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Includes assets pending verification.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Declare New Asset</CardTitle>
          <CardDescription>Add a vehicle, real estate, or other valuable asset.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddAssetForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Declared Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assets && assets.length > 0 ? (
              assets.map(asset => (
                <div key={asset.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{asset.name}</p>
                      {asset.status === "verified" ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      ) : asset.status === "rejected" ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" /> Rejected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{asset.type.replace("_", " ")}</p>
                    {asset.proof_document_url && (
                      <a href={asset.proof_document_url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatTZS(asset.estimated_value)}</p>
                    <p className="text-xs text-muted-foreground">Declared {new Date(asset.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No assets declared yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
