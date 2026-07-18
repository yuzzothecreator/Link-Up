"use client"

import { useActionState } from "react"
import {
  submitIdentityVerificationAction,
  uploadVerificationDocumentsAction,
} from "@/lib/actions/verification"
import type { ActionState } from "@/lib/actions/auth"
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
import { CheckCircle2, Upload } from "lucide-react"

const regions = [
  "Dar es Salaam",
  "Dodoma",
  "Arusha",
  "Mwanza",
  "Tanga",
  "Morogoro",
  "Mbeya",
  "Iringa",
  "Kilimanjaro",
  "Kagera",
  "Tabora",
  "Kigoma",
  "Shinyanga",
  "Mara",
  "Singida",
  "Rukwa",
  "Lindi",
  "Mtwara",
  "Ruvuma",
  "Pwani",
  "Geita",
  "Katavi",
  "Njombe",
  "Simiyu",
  "Songwe",
]

export function IdentityVerificationForm({
  locked,
  initial,
}: {
  locked: boolean
  initial: {
    dateOfBirth: string
    gender: string
    nidaNumber: string
    region: string
    district: string
  }
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitIdentityVerificationAction,
    {},
  )

  if (locked) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription>
          Your NIDA identity is already verified or under review. Document uploads below can still
          boost your Trust Score.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Date of birth *</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            defaultValue={initial.dateOfBirth}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select name="gender" required defaultValue={initial.gender || undefined}>
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
          defaultValue={initial.nidaNumber}
        />
        <p className="text-xs text-muted-foreground">
          First 8 digits (YYYYMMDD) must match your date of birth.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="region">Region *</Label>
          <Select name="region" required defaultValue={initial.region || undefined}>
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
          <Input
            id="district"
            name="district"
            placeholder="Optional"
            defaultValue={initial.district}
          />
        </div>
      </div>

      <Button type="submit" className="h-11 self-start" disabled={pending}>
        {pending ? "Submitting..." : "Submit for verification"}
      </Button>
    </form>
  )
}

function FileDrop({
  id,
  name,
  label,
  status,
}: {
  id: string
  name: string
  label: string
  status?: string
}) {
  const approved = status === "approved"
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {status ? (
          <span className="text-xs capitalize text-muted-foreground">{status.replace(/_/g, " ")}</span>
        ) : null}
      </div>
      {approved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Already approved — no re-upload needed.
        </div>
      ) : (
        <div className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 transition-colors hover:border-primary/50 hover:bg-primary/5">
          <Upload className="mb-3 h-8 w-8 text-muted-foreground group-hover:text-primary" />
          <p className="text-sm font-medium">Click or drag to upload</p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or PDF — max 5MB</p>
          <Input
            id={id}
            name={name}
            type="file"
            accept="image/*,.pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      )}
    </div>
  )
}

export function DocumentUploadForm({
  nationalIdStatus,
  businessLicenseStatus,
}: {
  nationalIdStatus?: string
  businessLicenseStatus?: string
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    uploadVerificationDocumentsAction,
    {},
  )

  const bothApproved =
    nationalIdStatus === "approved" && businessLicenseStatus === "approved"

  if (bothApproved) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription>Both documents are approved.</AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
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

      <FileDrop
        id="nationalId"
        name="nationalId"
        label="National ID (NIDA card) photo"
        status={nationalIdStatus}
      />
      <FileDrop
        id="businessLicense"
        name="businessLicense"
        label="Business license"
        status={businessLicenseStatus}
      />

      <Button type="submit" className="h-11 self-start" disabled={pending}>
        {pending ? "Uploading..." : "Upload for review"}
      </Button>
    </form>
  )
}
