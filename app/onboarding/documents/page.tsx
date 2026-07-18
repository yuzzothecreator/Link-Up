"use client"

import { useActionState } from "react"
import { saveDocumentsAction, skipDocumentsAction } from "@/lib/actions/onboarding"
import type { ActionState } from "@/lib/actions/auth"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Upload, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function DocumentsPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveDocumentsAction, {})

  return (
    <OnboardingShell currentStep="documents">
      <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Documents</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Upload your identity documents to boost your Trust Score. You can skip this step and upload later.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="nationalId">National ID (NIDA Card) photo</Label>
          <div className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
            <Upload className="mb-3 h-8 w-8 text-muted-foreground group-hover:text-primary" />
            <p className="text-sm font-medium text-card-foreground">Click or drag to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or PDF — max 5MB</p>
            <Input
              id="nationalId"
              name="nationalId"
              type="file"
              accept="image/*,.pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="businessLicense">Business license (optional)</Label>
          <div className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
            <Upload className="mb-3 h-8 w-8 text-muted-foreground group-hover:text-primary" />
            <p className="text-sm font-medium text-card-foreground">Click or drag to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or PDF — max 5MB</p>
            <Input
              id="businessLicense"
              name="businessLicense"
              type="file"
              accept="image/*,.pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Documents increase your Trust Score
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Each verified document adds points to your Trust Score after admin review,
                which improves your loan eligibility.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/onboarding/financial">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Button type="submit" formAction={skipDocumentsAction} variant="outline" disabled={pending}>
              Skip for now
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? "Completing..." : "Complete setup"}
            </Button>
          </div>
        </div>
      </form>
    </OnboardingShell>
  )
}
