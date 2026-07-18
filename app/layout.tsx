import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://link-up.vercel.app"

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Link-Up — Build credit, unlock loans",
    template: "%s · Link-Up",
  },
  description:
    "Link-Up helps Tanzanian small businesses verify identity, build a Trust Score, and access fair loans individually or through kikundi groups.",
  applicationName: "Link-Up",
  authors: [{ name: "Link-Up" }],
  keywords: [
    "Link-Up",
    "microfinance",
    "Tanzania",
    "Trust Score",
    "NIDA",
    "SME loans",
    "kikundi",
    "mobile money",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: siteUrl,
    siteName: "Link-Up",
    title: "Link-Up — Build credit, unlock loans",
    description:
      "Verify identity, build trust, and access fair loans for Tanzanian small businesses.",
    images: [
      {
        url: "/link-up-mark.png",
        width: 512,
        height: 512,
        alt: "Link-Up",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Link-Up — Build credit, unlock loans",
    description:
      "Verify identity, build trust, and access fair loans for Tanzanian small businesses.",
    images: ["/link-up-mark.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/link-up-mark.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/icon.svg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
