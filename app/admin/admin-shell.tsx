"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Landmark, FileCheck, LogOut, ChevronRight } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { logoutAction } from "@/lib/actions/auth"
import { LinkUpMark } from "@/components/brand/link-up-mark"

const adminNav = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Loans", href: "/admin/loans", icon: Landmark },
  { title: "KYC Review", href: "/admin/kyc", icon: FileCheck },
  { title: "Groups", href: "/admin/groups", icon: Users },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/admin">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <LinkUpMark className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Link-Up</span>
                    <span className="truncate text-xs text-muted-foreground font-medium">
                      Admin Panel
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href)
                      }
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <form action={logoutAction}>
                <SidebarMenuButton
                  type="submit"
                  tooltip="Log out"
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut />
                  <span>Log out</span>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              Admin
            </Link>
            {pathname !== "/admin" && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-medium capitalize text-foreground">
                  {pathname.split("/").pop()?.replace("-", " ")}
                </span>
              </>
            )}
          </nav>
        </header>
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
