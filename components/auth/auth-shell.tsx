import Link from "next/link"
import { LinkUpLogo } from "@/components/brand/link-up-mark"

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col bg-secondary/40">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/">
          <LinkUpLogo />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-balance text-card-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {subtitle}
            </p>
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
