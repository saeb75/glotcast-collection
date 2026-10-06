"use client"

import { ThemeProvider } from "next-themes"
import { type ReactNode, useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthController } from "@/controllers/AuthController"

/** Theme (light / dark / system, remembered by next-themes), tooltips, toasts, and the session's start. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => AuthController.init(), [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
