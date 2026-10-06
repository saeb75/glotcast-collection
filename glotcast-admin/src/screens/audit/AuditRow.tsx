import { Terminal } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { actionLabel, AUDIT } from "@/copy/audit"
import { shortId } from "@/domain/format"
import { type AuditEntry } from "@/schemas/admin"
import { RelativeTime } from "@/shared/RelativeTime"
import { UserAvatar } from "@/shared/UserAvatar"

const TARGET_PATHS: Record<string, (id: string) => string> = {
  podcast: (id) => `/podcasts/${id}`,
  episode: (id) => `/episodes/${id}`,
  list: (id) => `/lists/${id}`,
  user: (id) => `/users/${id}`,
  category: () => "/categories",
}

const show = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value))

/** One recorded admin action: when, who, what, on what (linked), with the recorded fields. */
export function AuditRow({
  entry: e,
  onFilterTarget,
}: {
  entry: AuditEntry
  onFilterTarget: (id: string) => void
}) {
  const path = e.targetType && e.targetId ? TARGET_PATHS[e.targetType]?.(e.targetId) : undefined
  const details = Object.entries(e.meta)

  return (
    <TableRow>
      <TableCell className="pl-4 whitespace-nowrap">
        <RelativeTime value={e.at} />
      </TableCell>
      <TableCell>
        {e.actor ? (
          <span className="inline-flex max-w-56 items-center gap-2">
            <UserAvatar name={e.actor.email} size="sm" />
            <span className="truncate">{e.actor.email ?? shortId(e.actor.id)}</span>
          </span>
        ) : (
          <Badge variant="outline">
            <Terminal data-icon="inline-start" />
            {AUDIT.cli}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium">{actionLabel(e.action)}</div>
        <div className="font-mono text-xs text-muted-foreground">{e.action}</div>
      </TableCell>
      <TableCell className="max-w-64">
        {e.targetId ? (
          <div className="flex items-center gap-1.5">
            {path ? (
              <Link href={path} className="truncate font-medium hover:underline">
                {AUDIT.targets[e.targetType ?? ""] ?? e.targetType} ·{" "}
                <span className="font-mono">{shortId(e.targetId)}</span>
              </Link>
            ) : (
              <span className="truncate">
                {AUDIT.targets[e.targetType ?? ""] ?? e.targetType} ·{" "}
                <span className="font-mono">{shortId(e.targetId)}</span>
              </span>
            )}
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onFilterTarget(e.targetId!)}
            >
              {AUDIT.history}
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden pr-4 lg:table-cell">
        {details.length ? (
          <div className="flex flex-wrap gap-1">
            {details.map(([key, value]) => (
              <Badge key={key} variant="secondary" className="max-w-64 font-normal">
                <span className="text-muted-foreground">{key}</span>
                <span className="truncate">{show(value)}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  )
}
