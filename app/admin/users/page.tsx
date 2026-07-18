import { requireRole } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { maskPhone } from "@/lib/format"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Users · Admin" }

export default async function AdminUsersPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const { data: users } = await admin
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      role,
      created_at,
      trust_scores(score)
    `)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage platform users.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Trust Score</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users ?? []).map((user: any) => {
                const score = user.trust_scores?.[0]?.score ?? "N/A"
                return (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">
                      <a href={`/admin/users/${user.id}`} className="hover:underline text-primary">
                        {user.full_name ?? "Unknown"}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{maskPhone(user.phone)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${score >= 700 ? "text-emerald-600" : score >= 400 ? "text-amber-600" : "text-red-600"}`}>
                        {score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
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
