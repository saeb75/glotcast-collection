"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HomeConfigController, type HomeSection } from "@/controllers/HomeConfigController"
import { HOME } from "@/copy/home"
import { type AdminList } from "@/schemas/admin"
import { SortableList } from "@/shared/SortableList"
import { TableCard } from "@/shared/TableCard"

const MAX = 30

/** Lists on the home or discover screen, in order. */
export function OrderedLists({
  section,
  title,
  description,
  ids,
  lists,
}: {
  section: Extract<HomeSection, "homeListIds" | "exploreListIds">
  title: string
  description: string
  ids: string[]
  lists: AdminList[] | undefined
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map((lists ?? []).map((l) => [l.id, l]))
  const remaining = (lists ?? []).filter((l) => !ids.includes(l.id))

  return (
    <TableCard
      title={title}
      description={`${description} ${HOME.max(MAX)}`}
      actions={
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={ids.length >= MAX}>
              <Plus />
              {HOME.addList}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder={HOME.addList} />
              <CommandList>
                <CommandEmpty>{lists?.length ? HOME.noListsLeft : HOME.noLists}</CommandEmpty>
                <CommandGroup>
                  {remaining.map((l) => (
                    <CommandItem
                      key={l.id}
                      value={`${l.name} ${l.slug}`}
                      onSelect={() => {
                        HomeConfigController.add(section, l.id)
                        setOpen(false)
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.episodeCount}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      }
    >
      {ids.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{HOME.empty}</p>
      ) : (
        <SortableList
          items={ids}
          getId={(id) => id}
          onReorder={(next) => HomeConfigController.setOrder(section, next)}
          onRemove={(id) => HomeConfigController.remove(section, id)}
          renderItem={(id) => {
            const list = byId.get(id)
            return list ? (
              <div className="flex items-center gap-3">
                <Link href={`/lists/${id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {list.name}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{HOME.episodesCount(list.episodeCount)}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {lists ? HOME.unknownList : "…"} <span className="font-mono text-xs">{id.slice(0, 8)}</span>
              </div>
            )
          }}
        />
      )}
    </TableCard>
  )
}
