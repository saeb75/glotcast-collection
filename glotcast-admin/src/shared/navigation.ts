import {
  AudioLines,
  House,
  LayoutDashboard,
  ListOrdered,
  type LucideIcon,
  Podcast,
  ScrollText,
  Tags,
  Users,
} from "lucide-react"
import { NAV_COPY } from "@/copy/nav"

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** The sidebar's sections, in order; the ⌘K menu and the breadcrumb read the same list. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: NAV_COPY.groups.overview,
    items: [{ to: "/", label: NAV_COPY.dashboard, icon: LayoutDashboard }],
  },
  {
    label: NAV_COPY.groups.content,
    items: [
      { to: "/podcasts", label: NAV_COPY.podcasts, icon: Podcast },
      { to: "/episodes", label: NAV_COPY.episodes, icon: AudioLines },
      { to: "/categories", label: NAV_COPY.categories, icon: Tags },
    ],
  },
  {
    label: NAV_COPY.groups.curation,
    items: [
      { to: "/lists", label: NAV_COPY.lists, icon: ListOrdered },
      { to: "/home", label: NAV_COPY.home, icon: House },
    ],
  },
  {
    label: NAV_COPY.groups.people,
    items: [
      { to: "/users", label: NAV_COPY.users, icon: Users },
      { to: "/audit", label: NAV_COPY.audit, icon: ScrollText },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/** The section a path belongs to ("/" only matches itself). */
export const navItemFor = (pathname: string): NavItem | undefined =>
  NAV_ITEMS.find((item) =>
    item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
