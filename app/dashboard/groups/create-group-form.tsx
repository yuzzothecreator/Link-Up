"use client"

import { useActionState } from "react"
import { createGroupAction } from "@/lib/actions/groups"
import type { ActionState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus } from "lucide-react"
import { useState } from "react"

export function CreateGroupForm() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createGroupAction, {})

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Group
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:min-w-[280px]">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" placeholder="e.g. Kariakoo Traders" required minLength={2} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
