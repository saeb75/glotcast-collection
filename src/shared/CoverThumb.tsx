"use client"

import { ImageOff } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const ASPECTS = { square: "aspect-square", portrait: "aspect-[3/4]", landscape: "aspect-[4/3]" } as const

/** A cover or banner; a placeholder when there is none or it fails to load. */
export function CoverThumb({
  url,
  alt,
  aspect = "square",
  className,
}: {
  url: string | null | undefined
  alt: string
  aspect?: keyof typeof ASPECTS
  className?: string
}) {
  const [failed, setFailed] = useState<string | null>(null)
  const show = url && failed !== url
  return (
    <div className={cn("w-10 shrink-0 overflow-hidden rounded-md border bg-muted", ASPECTS[aspect], className)}>
      {show ? (
        <img src={url} alt={alt} loading="lazy" className="size-full object-cover" onError={() => setFailed(url)} />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-3.5" />
        </div>
      )}
    </div>
  )
}
