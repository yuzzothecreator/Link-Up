"use client"

import { useActionState } from "react"
import Link from "next/link"
import { registerAction, type ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthShell } from "@/components/auth/auth-shell"

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerAction, {})

  return (
    <AuthShell
      title="Create your account"
      subtitle="Build a verifiable financial identity and unlock loans for your business."
      footer={
        <>
          Already have an account?{" "}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Asha Mwinyi"
            required
            autoComplete="name"
            defaultValue={state.fullName}
            readOnly={state.otpRequired}
          />
        </div>

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
          <p className="text-xs text-muted-foreground">
            We verify ownership before creating an authenticated session.
          </p>
        </div>

        {state.otpRequired && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
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
        )}

        <Button type="submit" className="mt-2 h-11" disabled={pending}>
          {pending
            ? state.otpRequired
              ? "Verifying..."
              : "Sending code..."
            : state.otpRequired
              ? "Verify & continue"
              : "Create account"}
        </Button>
      </form>
    </AuthShell>
  )
}
