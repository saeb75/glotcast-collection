"use client"

import { Search } from "lucide-react"
import { useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Search as you type (300 ms after the last key); uncontrolled so typing never waits for the URL. */
export function SearchField({
  initial,
  onSearch,
  placeholder,
  className,
  autoFocus,
}: {
  initial: string
  onSearch: (q: string) => void
  placeholder: string
  className?: string
  autoFocus?: boolean
}) {
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        defaultValue={initial}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => {
          const value = e.target.value.trim()
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onSearch(value), 300)
        }}
      />
    </div>
  )
}
