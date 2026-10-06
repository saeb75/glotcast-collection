"use client"

import { ChevronRight, Crown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { LEVEL_LABELS } from "@/copy/status"
import { USERS } from "@/copy/users"
import { shortId } from "@/domain/format"
import { type AdminUserRow } from "@/schemas/admin"
import { RelativeTime } from "@/shared/RelativeTime"
import { UserAvatar } from "@/shared/UserAvatar"

/** One user; the whole row opens the detail (opening it is audited). */
export function UserRow({ user: u }: { user: AdminUserRow }) {
  const router = useRouter()
  const to = `/users/${u.id}`
  const label = u.email ?? u.name ?? USERS.guest

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(to)}>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={u.isAnonymous ? null : (u.name ?? u.email)} />
          <div className="min-w-0">
            <Link
              href={to}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-72 truncate font-medium outline-none hover:underline focus-visible:underline"
            >
              {label}
            </Link>
            <div className="truncate text-xs text-muted-foreground">
              <span className="font-mono">{shortId(u.id)}</span>
              {u.email && u.name ? ` · ${u.name}` : ""}
            </div>
          </div>
          {u.isAnonymous ? <Badge variant="secondary">{USERS.guest}</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">{LEVEL_LABELS[u.level]}</TableCell>
      <TableCell>
        {u.featureAccess ? (
          <Badge>
            <Crown data-icon="inline-start" />
            {USERS.pro}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        <RelativeTime value={u.createdAt} />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <RelativeTime value={u.lastSeenAt} />
      </TableCell>
      <TableCell className="pr-4 text-muted-foreground">
        <ChevronRight className="size-4" />
      </TableCell>
    </TableRow>
  )
}
