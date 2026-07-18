"use client"

import { useActionState } from "react"
import { updateProfileAction } from "@/lib/actions/dashboard"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export function ProfileForm({
  initialData,
}: {
  initialData: {
    fullName: string
    businessName: string
    businessLocation: string
  }
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfileAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && state.message && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" name="fullName" defaultValue={initialData.fullName} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="businessName">Business Name</Label>
        <Input id="businessName" name="businessName" defaultValue={initialData.businessName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="businessLocation">Business Location</Label>
        <Input id="businessLocation" name="businessLocation" defaultValue={initialData.businessLocation} />
      </div>

      <Button type="submit" className="mt-2 w-fit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
