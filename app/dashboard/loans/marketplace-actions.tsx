"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  acceptLenderOfferAction,
  revokeApplicationConsentAction,
} from "@/lib/actions/marketplace"
import { toast } from "sonner"

export function AcceptOfferButton({ offerId }: { offerId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptLenderOfferAction(offerId)
          if (result.error) toast.error(result.error)
          else {
            toast.success(result.message)
            window.location.reload()
          }
        })
      }
    >
      {pending ? "Accepting..." : "Accept offer"}
    </Button>
  )
}

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Withdraw this application and revoke provider data access?")) return
        startTransition(async () => {
          const result = await revokeApplicationConsentAction(applicationId)
          if (result.error) toast.error(result.error)
          else {
            toast.success(result.message)
            window.location.reload()
          }
        })
      }}
    >
      {pending ? "Revoking..." : "Withdraw & revoke access"}
    </Button>
  )
}
