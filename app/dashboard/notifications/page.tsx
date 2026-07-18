import { requireOnboarded } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react"
import { markAsReadAction } from "@/lib/actions/notifications"

export default async function NotificationsPage() {
  const session = await requireOnboarded()
  const admin = createAdminClient()

  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Notifications Center</h1>
        <p className="text-muted-foreground">
          View your latest alerts, OTPs, and updates.
        </p>
      </div>

      <div className="space-y-4">
        {(!notifications || notifications.length === 0) ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>You have no notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={n.status === "unread" ? "border-primary/50 bg-primary/5" : ""}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="mt-1">
                  {n.status === "unread" ? (
                    <AlertCircle className="h-5 w-5 text-primary" />
                  ) : n.type === "payment_confirmation" || n.type === "kyc_approved" || n.type === "loan_approved" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium leading-none">
                      {n.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                {n.status === "unread" && (
                  <form action={markAsReadAction.bind(null, n.id)}>
                    <Button variant="ghost" size="sm">Mark Read</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
