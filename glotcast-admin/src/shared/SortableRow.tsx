"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { COMMON } from "@/copy/common"
import { cn } from "@/lib/utils"

/** One row of a SortableList: the drag handle (keyboard: Space, then the arrows), the content, remove. */
export function SortableRow({
  id,
  index,
  children,
  onRemove,
  disabled,
}: {
  id: string
  index: number
  children: ReactNode
  onRemove?: () => void
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled,
    })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 border-b bg-card px-2 py-2 last:border-b-0",
        isDragging && "relative z-10 rounded-md border shadow-md",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-not-allowed"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={COMMON.remove}
          disabled={disabled}
          onClick={onRemove}
        >
          <X />
        </Button>
      ) : null}
    </li>
  )
}
