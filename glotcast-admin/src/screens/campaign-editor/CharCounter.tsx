import { CAMPAIGNS } from "@/copy/campaigns"
import { counterLevel, textLength } from "@/domain/campaign"
import { cn } from "@/lib/utils"

/** "42/60": amber near the limit, red past it. */
export function CharCounter({ text, max }: { text: string; max: number }) {
  const length = textLength(text)
  const level = counterLevel(length, max)
  return (
    <span
      className={cn(
        "shrink-0 text-xs tabular-nums",
        level === "over"
          ? "font-medium text-destructive"
          : level === "near"
            ? "text-warning"
            : "text-muted-foreground",
      )}
    >
      {CAMPAIGNS.editor.counter(length, max)}
    </span>
  )
}
