import Link from "next/link"
import { Users, ArrowRight } from "lucide-react"
import { formatTZS } from "@/lib/format"
import { Button } from "@/components/ui/button"

interface GroupCardProps {
  id: string
  name: string
  memberCount: number
  totalSaved?: number
}

export function GroupCard({ id, name, memberCount, totalSaved = 0 }: GroupCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{memberCount} members</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Pool balance</p>
          <p className="mt-1 font-semibold text-foreground">{formatTZS(totalSaved)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Members</p>
          <p className="mt-1 font-semibold text-foreground">{memberCount}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
          <Link href={`/dashboard/groups/${id}`}>
            View Group
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
