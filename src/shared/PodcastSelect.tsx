"use client"

import { useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PodcastsController } from "@/controllers/PodcastsController"
import { cn } from "@/lib/utils"
import { usePodcastsStore } from "@/stores/usePodcastsStore"

/** Every podcast in a select; `allLabel` adds an "all" choice (a filter). */
export function PodcastSelect({
  value,
  onChange,
  label,
  placeholder,
  allLabel,
  className,
  id,
  invalid,
}: {
  value: string
  onChange: (id: string) => void
  label: string
  placeholder?: string
  allLabel?: string
  className?: string
  id?: string
  invalid?: boolean
}) {
  const options = usePodcastsStore((s) => s.options)

  useEffect(() => {
    void PodcastsController.loadOptions()
  }, [])

  const podcasts = options?.data ?? []
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className={cn("w-56", className)}
        aria-label={label}
        aria-invalid={invalid || undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="end" className="max-h-80">
        {allLabel ? <SelectItem value="all">{allLabel}</SelectItem> : null}
        {podcasts.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
        {/* The current value before the options arrive (a URL filter, an episode's podcast). */}
        {value && value !== "all" && !podcasts.some((p) => p.id === value) ? (
          <SelectItem value={value} disabled>
            …
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  )
}
