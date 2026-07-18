import { cn } from "@/lib/utils"

/** Link-Up brand mark: interlocking chain links (no circular frame). */
export function LinkUpMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <g
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-45 12 12)"
      >
        {/* Left link */}
        <rect x="2.5" y="8" width="11" height="8" rx="4" />
        {/* Right link */}
        <rect x="10.5" y="8" width="11" height="8" rx="4" />
      </g>
    </svg>
  )
}

export function LinkUpLogo({
  className,
  markClassName,
  showWordmark = true,
  markSize = "md",
}: {
  className?: string
  markClassName?: string
  showWordmark?: boolean
  markSize?: "sm" | "md"
}) {
  const box = markSize === "sm" ? "h-8 w-8" : "h-9 w-9"
  const icon = markSize === "sm" ? "h-4 w-4" : "h-5 w-5"

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          box,
        )}
      >
        <LinkUpMark className={cn(icon, markClassName)} />
      </span>
      {showWordmark ? (
        <span className="text-lg font-semibold tracking-tight text-foreground">Link-Up</span>
      ) : null}
    </span>
  )
}
