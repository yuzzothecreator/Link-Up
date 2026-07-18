import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatTZS } from "@/lib/format"
import { Users } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Groups · Admin" }

export default async function AdminGroupsPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const { data: groups } = await admin
    .from("groups")
    .select(`
      id,
      name,
      created_at,
      group_wallets(balance),
      group_members(id)
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kikundi Groups</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitor platform lending groups.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Group Name</th>
                <th className="px-6 py-4 font-medium">Members</th>
                <th className="px-6 py-4 font-medium">Pool Balance</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(groups ?? []).map((group: any) => {
                const membersCount = group.group_members?.length ?? 0
                const balance = group.group_wallets?.[0]?.balance ?? 0

                return (
                  <tr key={group.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{group.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {membersCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-600">
                      {formatTZS(balance)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
