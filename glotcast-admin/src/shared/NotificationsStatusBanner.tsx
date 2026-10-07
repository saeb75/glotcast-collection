"use client"

import { BellOff, KeyRound, TimerOff } from "lucide-react"
import { type LucideIcon } from "lucide-react"
import { useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AutomationsController } from "@/controllers/AutomationsController"
import { NOTIFY } from "@/copy/notifications"
import { tickIsStale } from "@/domain/automations"
import { formatRelative } from "@/domain/format"
import { useAutomationsStore } from "@/stores/useAutomationsStore"
import { useNow } from "./useNow"

/**
 * On the notification pages: why nothing goes out — OneSignal's keys missing, NOTIFICATIONS_ENABLED off, or a
 * scheduler that stopped running. Nothing when all is well.
 */
export function NotificationsStatusBanner() {
  const status = useAutomationsStore((s) => s.status?.data)
  const now = useNow(true, 60_000)

  useEffect(() => {
    void AutomationsController.loadStatus()
  }, [])

  if (!status) return null
  const b = NOTIFY.banner
  const notices: { icon: LucideIcon; title: string; body: string }[] = []
  if (!status.configured) notices.push({ icon: KeyRound, title: b.notConfiguredTitle, body: b.notConfigured })
  if (!status.enabled) notices.push({ icon: BellOff, title: b.disabledTitle, body: b.disabled })
  if (status.configured && status.enabled && tickIsStale(status.lastTickAt, now))
    notices.push({
      icon: TimerOff,
      title: b.staleTitle,
      body: b.stale(formatRelative(status.lastTickAt, now)),
    })
  if (notices.length === 0) return null

  return (
    <div className="grid gap-2">
      {notices.map((n) => (
        <Alert
          key={n.title}
          className="border-warning/50 bg-warning/5 *:data-[slot=alert-description]:text-foreground/80 [&>svg]:text-warning"
        >
          <n.icon />
          <AlertTitle>{n.title}</AlertTitle>
          <AlertDescription>{n.body}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
