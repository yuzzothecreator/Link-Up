"use client"

import { useActionState } from "react"
import Link from "next/link"
import { loginAction, type ActionState } from "@/lib/actions/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthShell } from "@/components/auth/auth-shell"

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, {})

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Enter your phone number to access your account."
      footer={
        <>
          New to Link-Up?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Create an account
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
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+255 7XX XXX XXX"
            required
            autoComplete="tel"
          />
        </div>

        <Button type="submit" className="mt-2 h-11" disabled={pending}>
          {pending ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthShell>
  )
}
