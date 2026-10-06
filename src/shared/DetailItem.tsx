import { type ReactNode } from "react"

/** A label and its value on one line (a description list row). */
export function DetailItem({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">
        {label}
        {hint ? <span className="block text-xs text-muted-foreground/70">{hint}</span> : null}
      </dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  )
}
