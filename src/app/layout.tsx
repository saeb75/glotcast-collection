import type { Metadata, Viewport } from "next"
import { type ReactNode } from "react"
import { Providers } from "@/shared/Providers"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "GlotCast Admin", template: "%s · GlotCast Admin" },
  description: "Podcasts, episodes and their levels, lists, the home screen and users.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
