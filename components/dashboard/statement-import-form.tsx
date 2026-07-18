"use client"

import { useActionState } from "react"
import { importStatementAction } from "@/lib/actions/statements"
import type { ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, FileSpreadsheet } from "lucide-react"

export function StatementImportForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importStatementAction,
    {},
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        <Label htmlFor="statement">Mobile money / bank statement (CSV)</Label>
        <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6">
          <FileSpreadsheet className="mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">Upload CSV export</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            M-Pesa, Tigo Pesa, Airtel Money, HaloPesa or bank CSV — max 2MB
          </p>
          <Input
            id="statement"
            name="statement"
            type="file"
            accept=".csv,text/csv"
            required
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Scanning..." : "Scan & update Trust Score"}
      </Button>
    </form>
  )
}
