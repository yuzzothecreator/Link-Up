"use client"

import { useTransition } from "react"
import { approveNidaAction, rejectNidaAction } from "@/lib/actions/admin"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

export function NidaActionButtons({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-8 flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await approveNidaAction(userId)
            window.location.reload()
          })
        }
      >
        <Check className="mr-1 h-3.5 w-3.5" /> Verify NIDA
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 flex-1 text-red-600 border-red-200 hover:bg-red-50"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await rejectNidaAction(userId)
            window.location.reload()
          })
        }
      >
        <X className="mr-1 h-3.5 w-3.5" /> Reject
      </Button>
    </div>
  )
}
