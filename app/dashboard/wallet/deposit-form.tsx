"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { depositAction } from "@/lib/actions/dashboard"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2 } from "lucide-react"

export function DepositForm({ payPhone }: { payPhone?: string }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionState, FormData>(depositAction, {})
  const [pollStatus, setPollStatus] = useState<"idle" | "waiting" | "completed" | "failed">("idle")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!state.pending || !state.reference) return

    setPollStatus("waiting")
    let attempts = 0

    const clear = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    pollRef.current = setInterval(async () => {
      attempts += 1
      try {
        const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(state.reference!)}`)
        const data = await res.json()
        if (data.status === "completed") {
          setPollStatus("completed")
          clear()
          router.refresh()
        } else if (data.status === "failed") {
          setPollStatus("failed")
          clear()
        } else if (attempts >= 40) {
          // ~2 minutes at 3s interval
          clear()
        }
      } catch {
        // keep polling
      }
    }, 3000)

    return clear
  }, [state.pending, state.reference, router])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && state.message && pollStatus !== "failed" && (
        <Alert>
          {pollStatus === "waiting" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          <AlertDescription>
            {pollStatus === "completed"
              ? "Payment confirmed — your wallet has been credited."
              : state.message}
          </AlertDescription>
        </Alert>
      )}
      {pollStatus === "failed" && (
        <Alert variant="destructive">
          <AlertDescription>Payment failed or was cancelled. Please try again.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Amount (TZS)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="1000"
          step="1000"
          placeholder="e.g. 50000"
          required
        />
        <p className="text-xs text-muted-foreground">
          Minimum TZS 1,000
          {payPhone ? ` · Prompt will be sent to ${payPhone}` : ""}
        </p>
      </div>

      <Button type="submit" className="h-11" disabled={pending || pollStatus === "waiting"}>
        {pending
          ? "Sending prompt..."
          : pollStatus === "waiting"
            ? "Waiting for phone confirmation..."
            : "Deposit now"}
      </Button>
    </form>
  )
}
