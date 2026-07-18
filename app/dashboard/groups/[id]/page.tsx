import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS, maskPhone } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Users, Wallet } from "lucide-react"
import { notFound } from "next/navigation"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await requireOnboarded()
  const admin = createAdminClient()

  // Verify membership
  const { data: membership } = await admin
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", session.userId)
    .single()

  if (!membership) {
    notFound()
  }

  // Get group details
  const { data: group } = await admin
    .from("groups")
    .select("*")
    .eq("id", id)
    .single()

  // Get members with their profiles and live trust scores
  const { data: members } = await admin
    .from("group_members")
    .select(`
      role,
      joined_at,
      profiles:user_id (
        id,
        full_name,
        phone,
        trust_scores:trust_scores (score)
      )
    `)
    .eq("group_id", id)

  // Get group wallet
  const { data: wallet } = await admin
    .from("group_wallets")
    .select("balance")
    .eq("group_id", id)
    .maybeSingle()

  if (!group) notFound()

  const membersList = members ?? []
  const balance = Number(wallet?.balance ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite code: <span className="font-mono font-medium">{group.invite_code}</span></p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Group Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <Wallet className="h-4 w-4" />
                <p className="text-sm font-medium">Group Pool Balance</p>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-tight">{formatTZS(balance)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-card-foreground">Group Overview</h2>
            <div className="mt-4 space-y-4">
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Members</span>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {membersList.length}
                </span>
              </div>
              <div className="flex justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm font-medium">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">My Role</span>
                <Badge variant={membership.role === "admin" ? "default" : "secondary"} className="capitalize">
                  {membership.role}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Members</h2>
            {membership.role === "admin" && (
              <Badge variant="outline">Admin View</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">People in this Kikundi group.</p>

          <div className="mt-6 divide-y divide-border border-t border-border">
            {membersList.map((m: any) => {
              const profile = m.profiles
              const score = Number(profile?.trust_scores?.score ?? profile?.trust_scores?.[0]?.score ?? 0)
              return (
                <div key={profile.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-foreground">{profile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{maskPhone(profile.phone)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {score > 0 ? (
                      <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" />
                        {score}
                      </div>
                    ) : null}
                    <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">
                      {m.role}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
