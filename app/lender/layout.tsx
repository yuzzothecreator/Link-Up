import Link from "next/link"
import { requireInstitutionMember } from "@/lib/auth/guards"
import { logoutAction } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Landmark, LayoutDashboard, FileSearch, LogOut } from "lucide-react"

export default async function LenderLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await requireInstitutionMember()

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/lender" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Link-Up Provider Portal</p>
              <p className="text-xs text-muted-foreground">{membership.organizationName}</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lender">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Overview
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lender/applications">
                <FileSearch className="mr-2 h-4 w-4" /> Applications
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}
