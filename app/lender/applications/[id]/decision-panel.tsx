"use client"

import { useActionState, useTransition } from "react"
import {
  createLenderOfferAction,
  rejectMarketplaceApplicationAction,
} from "@/lib/actions/marketplace"
import type { ActionState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

export function DecisionPanel({
  applicationId,
  requestedAmount,
  requestedTerm,
}: {
  applicationId: string
  requestedAmount: number
  requestedTerm: number
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createLenderOfferAction,
    {},
  )
  const [rejecting, startReject] = useTransition()

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="applicationId" value={applicationId} />
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state.success && (
          <Alert>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount">Approved amount</Label>
            <Input id="amount" name="amount" type="number" defaultValue={requestedAmount} required />
          </div>
          <div>
            <Label htmlFor="termDays">Term days</Label>
            <Input id="termDays" name="termDays" type="number" defaultValue={requestedTerm} required />
          </div>
          <div>
            <Label htmlFor="interestRate">Annual interest rate (%)</Label>
            <Input id="interestRate" name="interestRate" type="number" step="0.1" min="0" required />
          </div>
          <div>
            <Label htmlFor="fees">Fees (TZS)</Label>
            <Input id="fees" name="fees" type="number" min="0" defaultValue="0" required />
          </div>
        </div>
        <div>
          <Label htmlFor="conditions">Conditions</Label>
          <Textarea
            id="conditions"
            name="conditions"
            placeholder="Any conditions the borrower must satisfy before disbursement"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Preparing offer..." : "Send loan offer"}
        </Button>
      </form>

      <div className="border-t pt-5">
        <Button
          variant="destructive"
          disabled={rejecting}
          onClick={() => {
            const reason = window.prompt("Reason for rejection (shown to the customer):")
            if (!reason?.trim()) return
            startReject(async () => {
              const result = await rejectMarketplaceApplicationAction(applicationId, reason)
              if (result.error) toast.error(result.error)
              else {
                toast.success(result.message)
                window.location.href = "/lender/applications"
              }
            })
          }}
        >
          {rejecting ? "Rejecting..." : "Reject application"}
        </Button>
      </div>
    </div>
  )
}
