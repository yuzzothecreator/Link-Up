"use client"

import { useActionState, useState } from "react"
import { assignExistingUserRoleAction } from "@/lib/actions/admin-staff"
import type { ActionState } from "@/lib/actions/auth"
import type { Role } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"

interface Organization {
  id: string
  name: string
}

interface RoleAssignmentFormProps {
  userId: string
  currentRole: Role
  organizations: Organization[]
  disabled?: boolean
}

export function RoleAssignmentForm({
  userId,
  currentRole,
  organizations,
  disabled = false,
}: RoleAssignmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignExistingUserRoleAction,
    {},
  )
  const [role, setRole] = useState<Role>(currentRole)

  return (
    <form action={formAction} className="min-w-64 space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          disabled={disabled || pending}
          className="h-9 min-w-28 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Assign role"
        >
          <option value="borrower">Borrower</option>
          <option value="lender">Lender</option>
          <option value="admin">Admin</option>
        </select>
        {role === "lender" ? (
          <select
            name="organizationId"
            required
            disabled={disabled || pending}
            className="h-9 min-w-40 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Lender organization"
            defaultValue=""
          >
            <option value="" disabled>
              Select organization
            </option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={disabled || pending || (role === currentRole && role !== "lender")}
        >
          {pending ? "Saving…" : "Assign"}
        </Button>
      </div>
      {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      {state.success && state.message ? (
        <p className="text-xs text-emerald-600">{state.message}</p>
      ) : null}
      {disabled ? (
        <p className="text-xs text-muted-foreground">You cannot reassign your own account.</p>
      ) : null}
    </form>
  )
}
