"use client"

import { useActionState } from "react"
import { setUserRoleAction } from "@/lib/actions/admin-staff"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export function StaffAccessForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setUserRoleAction, {})

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold">Grant staff access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a real phone number. Staff log in with Briq SMS OTP — there is no shared password.
        </p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success && state.message ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" placeholder="Jane Admin" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone (E.164)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+2557XXXXXXXX"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            required
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="admin"
          >
            <option value="admin">Platform admin</option>
            <option value="lender">Lender / provider</option>
            <option value="borrower">Borrower (demote)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="organizationName">Lender org (if lender)</Label>
          <Input
            id="organizationName"
            name="organizationName"
            placeholder="Link-Up Partner Bank"
            defaultValue="Link-Up Partner Bank"
          />
        </div>
      </div>

      <Button type="submit" className="self-start" disabled={pending}>
        {pending ? "Saving..." : "Save staff access"}
      </Button>
    </form>
  )
}
