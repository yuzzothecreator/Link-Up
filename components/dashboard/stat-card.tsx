import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: string; direction: "up" | "down" | "flat" }
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={`group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md ${className ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-600"
                : trend.direction === "down"
                  ? "bg-red-50 text-red-600"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
            {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
            {trend.direction === "flat" && <Minus className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-card-foreground">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</div>}
      </div>
    </div>
  )
}
