import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { LinkUpLogo } from "@/components/brand/link-up-mark"

const steps = [
  { id: "kyc", label: "Personal Info", href: "/onboarding/kyc" },
  { id: "business", label: "Business", href: "/onboarding/business" },
  { id: "financial", label: "Financial", href: "/onboarding/financial" },
  { id: "documents", label: "Documents", href: "/onboarding/documents" },
]

export function OnboardingShell({
  currentStep,
  children,
}: {
  currentStep: string
  children: React.ReactNode
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <main className="flex min-h-screen flex-col bg-secondary/40">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-4 sm:px-6">
        <Link href="/">
          <LinkUpLogo />
        </Link>
        <span className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </span>
      </header>

      {/* Step indicator */}
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          {/* Progress bar */}
          <div className="relative mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Step pills */}
          <div className="flex items-center justify-between gap-1">
            {steps.map((step, i) => {
              const isCompleted = i < currentIndex
              const isCurrent = i === currentIndex
              const isFuture = i > currentIndex

              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2"
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-2 border-primary bg-primary/10 text-primary"
                          : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`hidden text-sm sm:block ${
                      isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
