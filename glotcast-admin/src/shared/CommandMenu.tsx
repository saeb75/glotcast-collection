"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { CommandController } from "@/controllers/CommandController"
import { NAV_COPY } from "@/copy/nav"
import { episodeLabel } from "@/domain/format"
import { useCommandStore } from "@/stores/useCommandStore"
import { CoverThumb } from "./CoverThumb"
import { NAV_ITEMS } from "./navigation"
import { StatusBadge } from "./StatusBadge"

const CREATE = [
  { to: "/podcasts/new", label: NAV_COPY.newPodcast },
  { to: "/episodes/new", label: NAV_COPY.newEpisode },
  { to: "/notifications/new", label: NAV_COPY.newCampaign },
]

/** ⌘K / Ctrl K: jump to a page, open a podcast or an episode by name, start a new one. */
export function CommandMenu() {
  const router = useRouter()
  const open = useCommandStore((s) => s.open)
  const query = useCommandStore((s) => s.query)
  const results = useCommandStore((s) => s.results)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        CommandController.toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.clearTimeout(timer.current)
    }
  }, [])

  const go = (to: string) => {
    CommandController.setOpen(false)
    router.push(to)
  }
  const q = query.toLowerCase()
  const pages = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q))
  const create = CREATE.filter((item) => item.label.toLowerCase().includes(q))
  const podcasts = results?.data?.podcasts ?? []
  const episodes = results?.data?.episodes ?? []

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => CommandController.setOpen(next)}
      title={NAV_COPY.search}
      description={NAV_COPY.searchHint}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={NAV_COPY.searchPlaceholder}
          onValueChange={(value) => {
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => void CommandController.search(value), 250)
          }}
        />
        <CommandList>
          {results?.loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner />
              {NAV_COPY.searching}
            </div>
          ) : (
            <CommandEmpty>{NAV_COPY.noResults}</CommandEmpty>
          )}
          {pages.length ? (
            <CommandGroup heading={NAV_COPY.pages}>
              {pages.map((item) => (
                <CommandItem key={item.to} value={`page:${item.to}`} onSelect={() => go(item.to)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {podcasts.length ? (
            <CommandGroup heading={NAV_COPY.foundPodcasts}>
              {podcasts.map((p) => (
                <CommandItem key={p.id} value={`podcast:${p.id}`} onSelect={() => go(`/podcasts/${p.id}`)}>
                  <CoverThumb url={p.coverUrl} alt="" className="w-6" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <StatusBadge status={p.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {episodes.length ? (
            <CommandGroup heading={NAV_COPY.foundEpisodes}>
              {episodes.map((e) => (
                <CommandItem key={e.id} value={`episode:${e.id}`} onSelect={() => go(`/episodes/${e.id}`)}>
                  <CoverThumb url={e.coverUrl} alt="" aspect="portrait" className="w-6" />
                  <span className="min-w-0 flex-1 truncate">
                    {episodeLabel(e)} <span className="text-muted-foreground">· {e.podcast.name}</span>
                  </span>
                  <StatusBadge status={e.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {create.length ? (
            <CommandGroup heading={NAV_COPY.actions}>
              {create.map((item) => (
                <CommandItem key={item.to} value={`create:${item.to}`} onSelect={() => go(item.to)}>
                  <Plus />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
