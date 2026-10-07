"use client"

import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { AUTOMATIONS } from "@/copy/automations"
import { weekOf } from "@/domain/automations"
import { formatCount, formatRate } from "@/domain/format"
import { cn } from "@/lib/utils"
import { type AutomationsView, type NotificationKind } from "@/schemas/admin"

/**
 * One automated push: on/off, who gets it and when (in plain words), its parameters, its last 7 days.
 * The parameters stay editable while it is off (dimmed).
 */
export function AutomationCard({
  kind,
  icon: Icon,
  title,
  who,
  what,
  enabled,
  onEnabled,
  view,
  children,
}: {
  kind: NotificationKind
  icon: LucideIcon
  title: string
  who: string
  what: string
  enabled: boolean
  onEnabled: (enabled: boolean) => void
  view: AutomationsView
  children?: ReactNode
}) {
  const week = weekOf(view.last7Days, kind)
  const w = AUTOMATIONS.week
  const id = `automation-${kind}`

  return (
    <Card className={cn("h-full", enabled && "ring-brand/30")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn("size-4", enabled ? "text-brand" : "text-muted-foreground")} />
          <label htmlFor={id}>{title}</label>
          <Badge variant={enabled ? "secondary" : "outline"} className={cn(enabled && "text-positive")}>
            {enabled ? AUTOMATIONS.on : AUTOMATIONS.off}
          </Badge>
        </CardTitle>
        <CardDescription>{who}</CardDescription>
        <CardAction>
          <Switch id={id} checked={enabled} onCheckedChange={onEnabled} aria-label={title} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className="text-sm text-muted-foreground">{what}</p>
        {children ? (
          <FieldGroup className={cn("grid gap-4 sm:grid-cols-2", !enabled && "opacity-70")}>
            {children}
          </FieldGroup>
        ) : null}
      </CardContent>
      <CardFooter className="gap-6 border-t text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{w.sent}</div>
          <div className="font-semibold tabular-nums">{formatCount(week.sent)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{w.opened}</div>
          <div className="font-semibold tabular-nums">
            {formatCount(week.opened)}
            {week.sent > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {w.rate(formatRate(week.opened, week.sent))}
              </span>
            ) : null}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
