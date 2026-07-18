"use client"

import { useState } from "react"
import { AlertCircle, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { resendOtpAction, verifyDashboardOtpAction } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function PhoneVerificationBanner({ phone }: { phone: string }) {
  const router = useRouter()
  const [step, setStep] = useState<"banner" | "verify">("banner")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRequestOtp = async () => {
    setLoading(true)
    // phone is already the raw unmasked E.164 number from the layout
    const res = await resendOtpAction(phone)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Verification code sent!")
      setStep("verify")
    }
    setLoading(false)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    setLoading(true)
    
    const formData = new FormData()
    formData.append("phone", phone)
    formData.append("code", code)
    
    const res = await verifyDashboardOtpAction({}, formData)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Phone verified successfully!")
      router.refresh()
    }
    setLoading(false)
  }

  if (step === "verify") {
    return (
      <Alert variant="default" className="mb-6 border-primary/50 bg-primary/5">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-semibold">Enter Verification Code</AlertTitle>
        <AlertDescription className="mt-2">
          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
            <Input 
              placeholder="Enter 6-digit code" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              maxLength={6}
              disabled={loading}
              className="max-w-[200px] bg-background"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading || code.length !== 6}>
                Verify
              </Button>
              <Button type="button" variant="ghost" disabled={loading} onClick={handleRequestOtp}>
                Resend
              </Button>
              <Button type="button" variant="ghost" disabled={loading} onClick={() => setStep("banner")}>
                Cancel
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Check your SMS for the Briq verification code.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Action Required: Verify Your Phone Number</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span>
          Your phone number is unverified. Please verify it to unlock full dashboard features such as applying for loans and creating groups.
        </span>
        <Button variant="outline" size="sm" onClick={handleRequestOtp} disabled={loading} className="shrink-0 bg-background/50 hover:bg-background">
          Verify Now
        </Button>
      </AlertDescription>
    </Alert>
  )
}
