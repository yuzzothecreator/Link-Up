"use client"

import { useActionState } from "react"
import { saveBusinessAction } from "@/lib/actions/onboarding"
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

const businessTypes = [
  "Retail / Shop",
  "Agriculture / Farming",
  "Food & Beverages",
  "Services",
  "Manufacturing",
  "Transport",
  "Construction",
  "Textiles / Tailoring",
  "Technology",
  "Other",
]

export default function BusinessPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBusinessAction, {})

  return (
    <OnboardingShell currentStep="business">
      <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Business Profile</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Tell us about your business so we can tailor loan products for you.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" placeholder="e.g. Mama Amina's Shop" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="businessType">Business type *</Label>
            <Select name="businessType" required>
              <SelectTrigger id="businessType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((t) => (
                  <SelectItem key={t} value={t.toLowerCase()}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location *</Label>
            <Input id="location" name="location" placeholder="e.g. Kariakoo, Dar es Salaam" required />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="yearsInOperation">Years in operation</Label>
            <Input id="yearsInOperation" name="yearsInOperation" type="number" min="0" max="99" placeholder="e.g. 3" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dailyIncome">Estimated daily income (TZS)</Label>
            <Input id="dailyIncome" name="dailyIncome" type="number" min="0" placeholder="e.g. 50000" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding/kyc">
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
