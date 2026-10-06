"use client"

import { Suspense } from "react"
import { LoginScreen } from "@/screens/login/LoginScreen"
import { SplashScreen } from "@/shared/SplashScreen"

export default function Page() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <LoginScreen />
    </Suspense>
  )
}
