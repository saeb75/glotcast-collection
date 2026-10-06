"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

/** A filter or a choice as a select: values in order, each with its label. */
export function OptionSelect<T extends string>({
  value,
  options,
  labels,
  onChange,
  label,
  className,
  disabled,
  id,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string> | ((value: T) => string)
  onChange: (value: T) => void
  /** Read to screen readers (the trigger shows the value only). */
  label: string
  className?: string
  disabled?: boolean
  id?: string
}) {
  const name = (v: T) => (typeof labels === "function" ? labels(v) : labels[v])
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger id={id} className={cn("w-44", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {name(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
