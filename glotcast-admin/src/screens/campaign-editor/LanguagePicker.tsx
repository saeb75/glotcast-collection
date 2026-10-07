"use client"

import { Check, ChevronsUpDown, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CAMPAIGNS } from "@/copy/campaigns"
import { COMMON } from "@/copy/common"
import { LOCALES, localeName } from "@/domain/campaign"
import { addUnique, without } from "@/domain/order"
import { cn } from "@/lib/utils"
import { type Locale } from "@/schemas/admin"

const BY_NAME = [...LOCALES].sort((a, b) => localeName(a).localeCompare(localeName(b)))

/** App languages to target, several at once; none = every language. */
export function LanguagePicker({
  value,
  onChange,
}: {
  value: Locale[]
  onChange: (value: Locale[]) => void
}) {
  const [open, setOpen] = useState(false)
  const a = CAMPAIGNS.editor.audience

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
              {value.length === 0 ? a.languagesAll : value.map(localeName).join(", ")}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={a.languagesSearch} />
            <CommandList>
              <CommandEmpty>{COMMON.none}</CommandEmpty>
              <CommandGroup>
                {BY_NAME.map((locale) => {
                  const selected = value.includes(locale)
                  return (
                    <CommandItem
                      key={locale}
                      value={`${localeName(locale)} ${locale}`}
                      onSelect={() => onChange(selected ? without(value, locale) : addUnique(value, locale))}
                    >
                      <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1">{localeName(locale)}</span>
                      <span className="font-mono text-xs text-muted-foreground uppercase">{locale}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((locale) => (
            <Badge key={locale} variant="secondary" className="h-6 gap-1 pr-1">
              {localeName(locale)}
              <button
                type="button"
                aria-label={`${COMMON.remove} ${localeName(locale)}`}
                className="rounded-sm p-0.5 hover:bg-foreground/10"
                onClick={() => onChange(without(value, locale))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange([])}>
            {COMMON.clear}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
