"use client"

import { ScrollText } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AuditController } from "@/controllers/AuditController"
import { actionLabel, AUDIT, KNOWN_ACTIONS } from "@/copy/audit"
import { COMMON } from "@/copy/common"
import { auditKey, auditParams, parseAudit } from "@/domain/lists"
import { EmptyState } from "@/shared/EmptyState"
import { ErrorState } from "@/shared/ErrorState"
import { LoadMoreFooter } from "@/shared/LoadMoreFooter"
import { OptionSelect } from "@/shared/OptionSelect"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { SearchField } from "@/shared/SearchField"
import { TableCard } from "@/shared/TableCard"
import { useUrlQuery } from "@/shared/useUrlQuery"
import { useAuditStore } from "@/stores/useAuditStore"
import { AuditRow } from "./AuditRow"

/** What admins changed and opened, newest first; filter by action or by record. */
export function AuditScreen() {
  const [query, setQuery] = useUrlQuery(parseAudit, auditParams)
  const key = auditKey(query)
  const entry = useAuditStore((s) => s.logs[key])
  const loadingMore = useAuditStore((s) => s.loadingMore[key] ?? false)
  const log = entry?.data
  const [targetReset, setTargetReset] = useState(0)
  const c = AUDIT.columns

  useEffect(() => {
    void AuditController.load(query)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- the key is the query

  const actions = ["all", ...KNOWN_ACTIONS]
  if (!actions.includes(query.action)) actions.push(query.action)
  const filtered = query.action !== "all" || query.target !== ""

  return (
    <>
      <PageHeader
        title={AUDIT.title}
        description={AUDIT.subtitle}
        actions={<RefreshButton loading={entry?.loading} onRefresh={() => void AuditController.load(query, true)} />}
      />
      <TableCard
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <OptionSelect
              label={c.action}
              value={query.action}
              options={actions}
              labels={(a) => (a === "all" ? AUDIT.allActions : actionLabel(a))}
              onChange={(action) => setQuery({ ...query, action })}
              className="w-64"
            />
            <SearchField
              key={`${targetReset}:${query.target}`}
              initial={query.target}
              placeholder={AUDIT.targetPlaceholder}
              onSearch={(target) => setQuery({ ...query, target })}
            />
            {filtered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTargetReset((n) => n + 1)
                  setQuery({ action: "all", target: "" })
                }}
              >
                {COMMON.clearFilters}
              </Button>
            ) : null}
          </div>
        }
        footer={
          log?.nextBefore !== undefined ? (
            <LoadMoreFooter loading={loadingMore} onLoadMore={() => void AuditController.loadMore(query)} />
          ) : undefined
        }
      >
        {entry?.error && !log ? (
          <div className="p-4">
            <ErrorState message={entry.error} onRetry={() => void AuditController.load(query, true)} />
          </div>
        ) : !log ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : log.items.length === 0 ? (
          <EmptyState icon={ScrollText} title={AUDIT.emptyTitle} description={AUDIT.emptyBody} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">{c.when}</TableHead>
                <TableHead>{c.admin}</TableHead>
                <TableHead>{c.action}</TableHead>
                <TableHead>{c.target}</TableHead>
                <TableHead className="hidden pr-4 lg:table-cell">{c.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.items.map((e) => (
                <AuditRow key={e.id} entry={e} onFilterTarget={(target) => setQuery({ ...query, target })} />
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
    </>
  )
}
