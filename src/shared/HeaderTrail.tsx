"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { EPISODES } from "@/copy/episodes"
import { PODCASTS } from "@/copy/podcasts"
import { USERS } from "@/copy/users"
import { shortId } from "@/domain/format"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { useListsStore } from "@/stores/useListsStore"
import { usePodcastsStore } from "@/stores/usePodcastsStore"
import { useUsersStore } from "@/stores/useUsersStore"
import { navItemFor } from "./navigation"

/** Section › item — where the page sits (Episodes › Lisbon mornings, Users › ash@example.com). */
export function HeaderTrail() {
  const pathname = usePathname()
  const section = navItemFor(pathname)
  const [, area, id] = pathname.split("/")
  const podcast = usePodcastsStore((s) => (area === "podcasts" && id ? s.details[id]?.data?.name : undefined))
  const episode = useEpisodesStore((s) => (area === "episodes" && id ? s.details[id]?.data?.title : undefined))
  const list = useListsStore((s) => (area === "lists" && id ? s.details[id]?.data?.name : undefined))
  const user = useUsersStore((s) => (area === "users" && id ? s.details[id]?.data?.user : undefined))

  const child = !id
    ? null
    : id === "new"
      ? area === "podcasts"
        ? PODCASTS.editor.newTitle
        : EPISODES.create.title
      : (podcast ?? episode ?? list ?? (user ? (user.email ?? user.name ?? USERS.guest) : null) ?? shortId(id))

  if (!section) return null
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem>
          {child ? (
            <BreadcrumbLink asChild>
              <Link href={section.to}>{section.label}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{section.label}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {child ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="max-w-72 truncate">{child}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
