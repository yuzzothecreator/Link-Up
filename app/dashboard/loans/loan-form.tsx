"use client"

import { useActionState } from "react"
import { applyLoanAction } from "@/lib/actions/dashboard"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

export function LoanApplicationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(applyLoanAction, {})

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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Loan Amount (TZS)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="5000"
            max="5000000"
            step="1000"
            placeholder="e.g. 100000"
            required
          />
          <p className="text-xs text-muted-foreground">Min 5,000 — Max 5,000,000</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="termDays">Term (Days)</Label>
          <Input
            id="termDays"
            name="termDays"
            type="number"
            min="7"
            max="365"
            placeholder="e.g. 30"
            required
          />
          <p className="text-xs text-muted-foreground">7 to 365 days</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="purpose">Loan Purpose</Label>
        <Textarea
          id="purpose"
          name="purpose"
          placeholder="Describe how you will use this loan for your business..."
          className="min-h-[100px] resize-y"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="groupId">Group/Kikundi (Optional)</Label>
        <Input
          id="groupId"
          name="groupId"
          placeholder="If applying via a group, leave blank for individual"
        />
        <p className="text-xs text-muted-foreground">
          Group-backed loans have higher approval rates and lower interest.
        </p>
      </div>

      <Button type="submit" className="mt-2 h-11" disabled={pending}>
        {pending ? "Submitting Application..." : "Submit Application"}
      </Button>
    </form>
  )
}
