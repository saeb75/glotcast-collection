"use client"

import { Button } from "@/components/ui/button"
import { COMMON } from "@/copy/common"
import { NOTIFY } from "@/copy/notifications"
import { SEND_LOG } from "@/copy/sendLog"
import { isUuid } from "@/domain/campaign"
import { shortId } from "@/domain/format"
import { SEND_KINDS, SEND_STATUSES, type SendLogQuery } from "@/domain/lists"
import { type AdminCampaign } from "@/schemas/admin"
import { OptionSelect } from "@/shared/OptionSelect"
import { SearchField } from "@/shared/SearchField"

type Filters = Partial<SendLogQuery>

/** Kind · status · campaign · user id. */
export function SendLogToolbar({
  query,
  campaigns,
  userReset,
  onChange,
  onClear,
}: {
  query: SendLogQuery
  campaigns: AdminCampaign[] | undefined
  userReset: number
  onChange: (patch: Filters) => void
  onClear?: () => void
}) {
  const campaignIds = ["all", ...(campaigns ?? []).map((c) => c.id)]
  if (!campaignIds.includes(query.campaign)) campaignIds.push(query.campaign)
  const campaignLabel = (id: string) =>
    id === "all" ? SEND_LOG.allCampaigns : (campaigns?.find((c) => c.id === id)?.name ?? shortId(id))
  const userInvalid = query.user !== "" && !isUuid(query.user)

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <OptionSelect
            label={SEND_LOG.kind}
            value={query.kind}
            options={SEND_KINDS}
            labels={(k) => (k === "all" ? SEND_LOG.allKinds : NOTIFY.kinds[k])}
            onChange={(kind) => onChange({ kind })}
            className="w-40"
          />
          <OptionSelect
            label={SEND_LOG.status}
            value={query.status}
            options={SEND_STATUSES}
            labels={(s) => (s === "all" ? SEND_LOG.allStatuses : NOTIFY.sendStatuses[s])}
            onChange={(status) => onChange({ status })}
            className="w-40"
          />
          <OptionSelect
            label={SEND_LOG.campaign}
            value={query.campaign}
            options={campaignIds}
            labels={campaignLabel}
            onChange={(campaign) => onChange({ campaign })}
            className="w-52"
          />
        </div>
        <SearchField
          key={`${userReset}:${query.user}`}
          initial={query.user}
          placeholder={SEND_LOG.userPlaceholder}
          className="sm:max-w-xs"
          onSearch={(user) => onChange({ user })}
        />
        {onClear ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {COMMON.clearFilters}
          </Button>
        ) : null}
      </div>
      {userInvalid ? <p className="text-xs text-destructive">{SEND_LOG.userInvalid}</p> : null}
    </div>
  )
}
