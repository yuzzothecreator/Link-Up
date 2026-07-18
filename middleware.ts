import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "bt_session"

async function readSession(token: string | undefined) {
  if (!token) return null
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload as { userId: string; role: string; onboardingComplete: boolean }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await readSession(token)

  const isAuthPage = pathname.startsWith("/auth")
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin")

  // Not logged in trying to access a protected area.
  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Logged in but visiting an auth page → send to the right place.
  if (isAuthPage && session) {
    const url = request.nextUrl.clone()
    url.pathname = session.onboardingComplete ? "/dashboard" : "/onboarding"
    return NextResponse.redirect(url)
  }

  // Admin area requires admin role.
  if (pathname.startsWith("/admin") && session && session.role !== "admin") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Force onboarding completion before dashboard access.
  if (
    pathname.startsWith("/dashboard") &&
    session &&
    !session.onboardingComplete
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/onboarding"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/admin/:path*", "/auth/:path*"],
}
