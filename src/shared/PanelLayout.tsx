"use client"

import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useEffect } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AuthController } from "@/controllers/AuthController"
import { AUTH } from "@/copy/auth"
import { ForbiddenScreen } from "@/screens/forbidden/ForbiddenScreen"
import { useAuthStore } from "@/stores/useAuthStore"
import { AppSidebar } from "./AppSidebar"
import { CommandMenu } from "./CommandMenu"
import { ErrorState } from "./ErrorState"
import { SiteHeader } from "./SiteHeader"
import { SplashScreen } from "./SplashScreen"

/**
 * The client-side gate behind the proxy's: signed in (else /login) and an admin according to
 * GET /v1/admin/me (else Forbidden); then the sidebar shell.
 */
export function PanelLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const ready = useAuthStore((s) => s.ready)
  const user = useAuthStore((s) => s.user)
  const access = useAuthStore((s) => s.access)
  const accessError = useAuthStore((s) => s.accessError)

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [ready, user, router, pathname])

  useEffect(() => {
    if (user && access === "unknown") void AuthController.checkAccess()
  }, [user, access])

  if (!ready || !user) return <SplashScreen />
  if (access === "forbidden") return <ForbiddenScreen />
  if (access === "failed")
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-6">
        <ErrorState title={AUTH.accessFailed} message={accessError} onRetry={() => void AuthController.checkAccess()} />
      </div>
    )
  if (access !== "granted") return <SplashScreen label={AUTH.checking} />

  return (
    <SidebarProvider>
      <CommandMenu />
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
