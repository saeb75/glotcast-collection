import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LEVEL_LABELS, LEVEL_SHORT } from "@/copy/status"
import { formatClock } from "@/domain/format"
import { LEVELS, levelOf } from "@/domain/levels"
import { cn } from "@/lib/utils"
import { type AdminEpisodeLevel } from "@/schemas/admin"

/** BG · IN · AD: filled when the level has audio (its length and line count on hover). */
export function LevelBadges({ levels }: { levels: AdminEpisodeLevel[] }) {
  return (
    <div className="flex items-center gap-1">
      {LEVELS.map((level) => {
        const l = levelOf(levels, level)
        return (
          <Tooltip key={level}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex h-5 min-w-7 items-center justify-center rounded-md border px-1 font-mono text-[10px] font-semibold",
                  l
                    ? "border-transparent bg-foreground text-background"
                    : "border-dashed text-muted-foreground/60",
                )}
              >
                {LEVEL_SHORT[level]}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {LEVEL_LABELS[level]}
              {l ? ` · ${formatClock(l.durationSec)} · ${l.chunkCount} lines` : " · none"}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
