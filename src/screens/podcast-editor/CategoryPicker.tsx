"use client"

import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CategoriesController } from "@/controllers/CategoriesController"
import { PODCASTS } from "@/copy/podcasts"
import { addUnique, without } from "@/domain/order"
import { type CategoryRef } from "@/schemas/admin"
import { SortableList } from "@/shared/SortableList"
import { useCategoriesStore } from "@/stores/useCategoriesStore"

/** The podcast's categories, in order (drag to reorder); add from every category, remove with ×. */
export function CategoryPicker({
  value,
  onChange,
  known,
  disabled,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  /** Names for ids before the category list arrives (the podcast's own). */
  known: CategoryRef[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const all = useCategoriesStore((s) => s.entry?.data)

  useEffect(() => {
    void CategoriesController.load()
  }, [])

  const byId = new Map<string, CategoryRef>([...known, ...(all ?? [])].map((c) => [c.id, c]))
  const remaining = (all ?? []).filter((c) => !value.includes(c.id))

  return (
    <div className="space-y-2">
      {value.length ? (
        <div className="rounded-lg border">
          <SortableList
            items={value}
            getId={(id) => id}
            onReorder={onChange}
            onRemove={(id) => onChange(without(value, id))}
            disabled={disabled}
            renderItem={(id) => (
              <div className="flex items-baseline gap-2">
                <span className="truncate text-sm font-medium">{byId.get(id)?.name ?? id}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{byId.get(id)?.slug}</span>
              </div>
            )}
          />
        </div>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <Plus />
            {PODCASTS.editor.addCategory}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={PODCASTS.editor.categories} />
            <CommandList>
              <CommandEmpty>{PODCASTS.editor.noCategories}</CommandEmpty>
              <CommandGroup>
                {remaining.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${c.slug}`}
                    onSelect={() => {
                      onChange(addUnique(value, c.id))
                      setOpen(false)
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
