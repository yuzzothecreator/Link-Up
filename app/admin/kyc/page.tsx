import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { KycActionButtons } from "./kyc-actions"
import { NidaActionButtons } from "./nida-actions"
import { FileText, Image as ImageIcon, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "KYC Review · Admin" }

export default async function AdminKycPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const [{ data: documents }, pendingNidaRes] = await Promise.all([
    admin
      .from("documents")
      .select(
        `
      *,
      profiles:user_id (
        full_name,
        nida_number,
        phone
      )
    `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, phone, nida_number, nida_verification_status, date_of_birth")
      .eq("nida_verification_status", "pending_manual")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const docs = documents ?? []
  const pendingNida = pendingNidaRes.error ? [] : pendingNidaRes.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify NIDA identity and uploaded documents before loans are unlocked.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending NIDA reviews</h2>
        {pendingNida.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No NIDA numbers waiting for manual confirmation.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingNida.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <Badge variant="outline" className="mb-3">
                  pending manual
                </Badge>
                <p className="font-semibold">{p.full_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.phone}</p>
                <p className="mt-2 text-sm">
                  DOB: <span className="font-medium">{p.date_of_birth}</span>
                </p>
                <p className="text-sm">
                  NIDA: <span className="font-mono text-xs">{p.nida_number}</span>
                </p>
                <div className="mt-4">
                  <NidaActionButtons userId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending documents</h2>
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No pending documents to review.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc: {
              id: string
              type: string
              created_at: string
              reference: string
              profiles: { full_name?: string; nida_number?: string; phone?: string } | null
            }) => {
              const profile = doc.profiles
              return (
                <div
                  key={doc.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="border-b border-border bg-muted/20 p-5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize bg-background">
                        {doc.type.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="font-semibold text-foreground">{profile?.full_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        NIDA: {profile?.nida_number ?? "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center border-b border-border bg-muted/5 p-5">
                    <div className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background text-muted-foreground">
                      <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
                      <span className="font-mono text-xs">{doc.reference.slice(0, 28)}...</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <KycActionButtons documentId={doc.id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
