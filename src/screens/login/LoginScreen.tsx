"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { AUTH } from "@/copy/auth"
import { APP } from "@/copy/common"
import { safeNext } from "@/domain/query"
import { SupabaseService } from "@/services/SupabaseService"
import { BrandMark } from "@/shared/BrandMark"
import { SplashScreen } from "@/shared/SplashScreen"
import { ThemeToggle } from "@/shared/ThemeToggle"
import { useAuthStore } from "@/stores/useAuthStore"
import { useLoginStore } from "@/stores/useLoginStore"
import { CodeForm } from "./CodeForm"
import { EmailForm } from "./EmailForm"

/** Email → code; a signed-in visitor goes on to where they were headed (whose gate checks the role). */
export function LoginScreen() {
  const router = useRouter()
  const next = safeNext(useSearchParams().get("next"))
  const ready = useAuthStore((s) => s.ready)
  const user = useAuthStore((s) => s.user)
  const step = useLoginStore((s) => s.step)

  useEffect(() => {
    if (ready && user) router.replace(next)
  }, [ready, user, router, next])

  if (!ready || user) return <SplashScreen />

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2 font-medium">
        <BrandMark className="size-7" />
        <span>
          {APP.name} <span className="text-muted-foreground">· {APP.area}</span>
        </span>
      </div>
      <Card className="w-full max-w-sm">
        <CardContent>
          {!SupabaseService.configured ? (
            <Alert>
              <AlertDescription>{AUTH.notConfigured}</AlertDescription>
            </Alert>
          ) : step === "email" ? (
            <EmailForm />
          ) : (
            <CodeForm />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
