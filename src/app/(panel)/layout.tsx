"use client"

import { type ReactNode, Suspense } from "react"
import { PanelLayout } from "@/shared/PanelLayout"
import { SplashScreen } from "@/shared/SplashScreen"

/** Every page but /login: the admin gate and the sidebar shell. */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <PanelLayout>
      <Suspense fallback={<SplashScreen />}>{children}</Suspense>
    </PanelLayout>
  )
}
