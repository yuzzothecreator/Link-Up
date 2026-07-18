import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { GroupCard } from "@/components/dashboard/group-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { CreateGroupForm } from "./create-group-form"
import { Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Kikundi Groups" }

export default async function GroupsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: memberships } = await admin
    .from("group_members")
    .select(`
      group_id,
      groups:groups (
        id,
        name
      )
    `)
    .eq("user_id", session.userId)

  const groupRows = (memberships ?? [])
    .map((m) => m.groups as unknown as { id: string; name: string } | null)
    .filter((g): g is { id: string; name: string } => Boolean(g))

  const cards = await Promise.all(
    groupRows.map(async (group) => {
      const [{ count }, { data: wallet }] = await Promise.all([
        admin
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group.id),
        admin.from("group_wallets").select("balance").eq("group_id", group.id).maybeSingle(),
      ])
      return {
        id: group.id,
        name: group.name,
        memberCount: count ?? 0,
        totalSaved: Number(wallet?.balance ?? 0),
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kikundi Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pool resources with trusted peers for group-backed loans.
          </p>
        </div>
        <CreateGroupForm />
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="You are not part of any Kikundi yet. Create a new one or ask a group admin to add you."
            action={<CreateGroupForm />}
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((g) => (
            <GroupCard
              key={g.id}
              id={g.id}
              name={g.name}
              memberCount={g.memberCount}
              totalSaved={g.totalSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
