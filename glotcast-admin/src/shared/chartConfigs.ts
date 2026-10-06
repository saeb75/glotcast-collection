import { type ChartConfig } from "@/components/ui/chart"
import { DASHBOARD } from "@/copy/dashboard"
import { USERS } from "@/copy/users"

export const LISTENERS = {
  count: { label: DASHBOARD.listeners, color: "var(--chart-1)" },
} satisfies ChartConfig

export const MINUTES = {
  minutes: { label: USERS.detail.minutesLabel, color: "var(--chart-1)" },
} satisfies ChartConfig
