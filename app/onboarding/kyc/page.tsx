"use client"

import { useActionState } from "react"
import { saveKycAction } from "@/lib/actions/onboarding"
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
import { ArrowRight } from "lucide-react"

const regions = [
  "Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Tanga", "Morogoro",
  "Mbeya", "Iringa", "Kilimanjaro", "Kagera", "Tabora", "Kigoma",
  "Shinyanga", "Mara", "Singida", "Rukwa", "Lindi", "Mtwara",
  "Ruvuma", "Pwani", "Geita", "Katavi", "Njombe", "Simiyu", "Songwe",
]

export default function KycPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveKycAction, {})

  return (
    <OnboardingShell currentStep="kyc">
      <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Personal Information</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We need a few details to verify your identity and comply with KYC regulations.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dateOfBirth">Date of birth *</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gender">Gender *</Label>
            <Select name="gender" required>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nidaNumber">NIDA Number *</Label>
          <Input
            id="nidaNumber"
            name="nidaNumber"
            placeholder="e.g. 19900101-12345-12345-12"
            required
            pattern="[\d\-]{20,25}"
            title="20-digit National ID number"
          />
          <p className="text-xs text-muted-foreground">
            Must be your real 20-digit National ID. The first 8 digits (YYYYMMDD) must match your date of birth above.
            Fake or mismatched numbers are rejected.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="region">Region *</Label>
            <Select name="region" required>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r.toLowerCase()}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" name="district" placeholder="Optional" />
          </div>
        </div>

        <Button type="submit" className="mt-2 h-11 self-end" disabled={pending}>
          {pending ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </OnboardingShell>
  )
}
