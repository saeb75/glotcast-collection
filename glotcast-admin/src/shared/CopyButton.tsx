"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { COMMON } from "@/copy/common"
import { ClipboardService } from "@/services/ClipboardService"
import { ToastService } from "@/services/ToastService"

/** Copies a value (an id, a URL); a tick for a moment afterwards. */
export function CopyButton({ value, label = COMMON.copy }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!(await ClipboardService.copy(value))) return ToastService.error(COMMON.copyFailed)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={label} onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? COMMON.copied : label}</TooltipContent>
    </Tooltip>
  )
}
