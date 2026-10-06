"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatDay, formatShortDay } from "@/domain/format"
import { cn } from "@/lib/utils"

/** Values per day, stacked by series (the config's keys, bottom first). */
export function DailyBarChart<T extends { date: string }>({
  data,
  config,
  className,
  tickFormatter = formatShortDay,
}: {
  data: T[]
  config: ChartConfig
  className?: string
  tickFormatter?: (value: string) => string
}) {
  const keys = Object.keys(config)
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-52 w-full", className)}>
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={tickFormatter}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />}
        />
        {keys.length > 1 ? (
          <ChartLegend
            itemSorter={(item) => keys.indexOf(String(item.dataKey))}
            content={<ChartLegendContent />}
          />
        ) : null}
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="day"
            fill={`var(--color-${key})`}
            radius={i === keys.length - 1 ? [3, 3, 0, 0] : 0}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
