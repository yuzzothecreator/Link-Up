import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Link-Up — Build credit, unlock loans",
  description:
    "Verify your NIDA identity, build a Trust Score, and access fair loans for your small business in Tanzania.",
  alternates: { canonical: "/" },
}

export default function LandingPage() {
  redirect("/auth/register")
}
