import { AudioLines } from "lucide-react"
import { cn } from "@/lib/utils"

/** The panel's square logo (GlotCast pink). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground",
        className,
      )}
    >
      <AudioLines className="size-4" />
    </div>
  )
}
