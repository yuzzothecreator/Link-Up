"use client"

import { useTransition } from "react"
import { approveLoanAction, rejectLoanAction } from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

export function LoanActionButtons({ loanId }: { loanId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleApprove = () => {
    startTransition(async () => {
      await approveLoanAction(loanId)
      window.location.reload()
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      await rejectLoanAction(loanId, "Does not meet criteria")
      window.location.reload()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={handleApprove} disabled={isPending}>
        <Check className="mr-1 h-3.5 w-3.5" /> Approve
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={handleReject} disabled={isPending}>
        <X className="mr-1 h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  )
}
