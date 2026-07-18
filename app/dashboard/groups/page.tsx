import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { GroupCard } from "@/components/dashboard/group-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Kikundi Groups · Link-Up" }

export default async function GroupsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  // Get groups the user is a member of
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

  // We'll mock the counts and balances for the list view to avoid complex joins right now
  const groups = (memberships ?? [])
    .map((m) => m.groups)
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kikundi Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pool resources with trusted peers for group-backed loans.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="You are not part of any Kikundi yet. Create a new one or ask a group admin to add you."
            action={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g: any) => (
            <GroupCard
              key={g.id}
              id={g.id}
              name={g.name}
              memberCount={Math.floor(Math.random() * 10) + 3} // Mock data
              totalSaved={Math.floor(Math.random() * 5000000)} // Mock data
              trustScore={Math.floor(Math.random() * 300) + 500} // Mock data
            />
          ))}
        </div>
      )}
    </div>
  )
}
