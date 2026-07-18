"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthShell } from "@/components/auth/auth-shell"

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  )
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  return (
    <AuthShell
      title="Reset password"
      subtitle="We send an SMS code to prove you own the phone, then you set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="flex flex-col gap-4">
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state.success && state.message ? (
          <Alert>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+255 7XX XXX XXX"
            required
            autoComplete="tel"
            defaultValue={state.phone}
            readOnly={state.otpRequired}
          />
        </div>

        {state.otpRequired ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">SMS code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </>
        ) : null}

        <Button type="submit" className="mt-2 h-11" disabled={pending}>
          {pending
            ? state.otpRequired
              ? "Saving..."
              : "Sending code..."
            : state.otpRequired
              ? "Set password & log in"
              : "Send reset code"}
        </Button>
      </form>
    </AuthShell>
  )
}
