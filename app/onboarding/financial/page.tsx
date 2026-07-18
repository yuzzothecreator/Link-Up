"use client"

import { useActionState } from "react"
import { saveFinancialAction } from "@/lib/actions/onboarding"
import type { ActionState } from "@/lib/actions/auth"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"

const providers = [
  { value: "mpesa", label: "M-Pesa (Vodacom)" },
  { value: "tigopesa", label: "Tigo Pesa" },
  { value: "airtelmoney", label: "Airtel Money" },
  { value: "halopesa", label: "HaloPesa" },
]

export default function FinancialPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveFinancialAction, {})

  return (
    <OnboardingShell currentStep="financial">
      <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Financial Details</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Connect your mobile money account so we can process deposits and disbursements.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="mobileMoneyProvider">Mobile money provider *</Label>
          <Select name="mobileMoneyProvider" required>
            <SelectTrigger id="mobileMoneyProvider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mobileMoneyNumber">Mobile money phone number</Label>
          <Input
            id="mobileMoneyNumber"
            name="mobileMoneyNumber"
            type="tel"
            inputMode="tel"
            placeholder="+255 7XX XXX XXX"
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use your registered phone number.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bankAccount">Bank account number (optional)</Label>
          <Input
            id="bankAccount"
            name="bankAccount"
            placeholder="Optional — if you have a bank account"
          />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding/business">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Saving..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </OnboardingShell>
  )
}
