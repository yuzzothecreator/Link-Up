import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

export type NidaStatus =
  | "unverified"
  | "pending_manual"
  | "format_valid"
  | "verified"
  | "rejected"
  | string

export function VerificationStatusBanner({
  isPhoneVerified,
  nidaStatus,
}: {
  isPhoneVerified: boolean
  nidaStatus: NidaStatus | null | undefined
}) {
  const status = nidaStatus ?? "unverified"

  if (!isPhoneVerified) return null

  if (status === "verified") {
    return (
      <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle>Identity verified</AlertTitle>
        <AlertDescription>
          Your NIDA was approved. You can apply for loans on the{" "}
          <Link href="/dashboard/loans" className="font-medium underline underline-offset-2">
            Loans
          </Link>{" "}
          page.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "pending_manual" || status === "format_valid") {
    return (
      <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle>Verification under review</AlertTitle>
        <AlertDescription>
          An admin is reviewing your NIDA. You will get an SMS and an in-app notification when it is
          approved or rejected. Loan applications stay locked until then.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "rejected") {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Verification not approved</AlertTitle>
        <AlertDescription>
          Your NIDA was rejected.           Update your details on{" "}
          <Link href="/dashboard/verification" className="font-medium underline underline-offset-2">
            Verification
          </Link>{" "}
          and resubmit for review.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertTitle>Complete identity verification</AlertTitle>
      <AlertDescription>
        Phone is verified, but NIDA approval is still required before you can apply for a loan.
        Check your status on{" "}
        <Link href="/dashboard/verification" className="font-medium underline underline-offset-2">
          Verification
        </Link>
        .
      </AlertDescription>
    </Alert>
  )
}

export function documentStatusLabel(status: string | undefined) {
  switch (status) {
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    case "pending":
      return "Under review"
    default:
      return "Not uploaded"
  }
}
