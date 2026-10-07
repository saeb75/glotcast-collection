"use client"

import { ArrowLeft, CircleStop, Copy, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CampaignsController } from "@/controllers/CampaignsController"
import { PodcastsController } from "@/controllers/PodcastsController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { DELIVERY_WORDS } from "@/copy/notifications"
import { deliverySummary, isLive, isLocale } from "@/domain/campaign"
import { formatDateTime } from "@/domain/format"
import { type AdminCampaign, type Locale } from "@/schemas/admin"
import { CampaignStatusBadge } from "@/shared/CampaignStatusBadge"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { NotificationsStatusBanner } from "@/shared/NotificationsStatusBanner"
import { PageHeader } from "@/shared/PageHeader"
import { PushPreview } from "@/shared/PushPreview"
import { RefreshButton } from "@/shared/RefreshButton"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { CampaignFacts } from "./CampaignFacts"
import { CampaignStatsCards } from "./CampaignStatsCards"
import { LanguageBreakdown } from "./LanguageBreakdown"
import { SentMessages } from "./SentMessages"

const POLL_MS = 10_000

/** A campaign that was sent (or is on its way): status, results, by language, the messages; cancel, copy, delete. */
export function CampaignDetailScreen({ campaign: c }: { campaign: AdminCampaign }) {
  const router = useRouter()
  const busy = useCampaignsStore((s) => s.busy[c.id])
  const loading = useCampaignsStore((s) => s.details[c.id]?.loading ?? false)
  const source: Locale = isLocale(c.sourceLanguage) ? c.sourceLanguage : "en"
  const [language, setLanguage] = useState<Locale>(source)
  const live = isLive(c.status)
  const d = CAMPAIGNS.detail

  useEffect(() => {
    void CampaignsController.loadStats(c.id)
    void PodcastsController.loadOptions()
  }, [c.id])

  useEffect(() => {
    // While it goes out, the status and the numbers follow by themselves.
    if (!live) return
    const timer = window.setInterval(() => {
      void CampaignsController.loadCampaign(c.id, true)
      void CampaignsController.loadStats(c.id, { force: true })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [c.id, live])

  const line =
    c.status === "scheduled"
      ? d.lines.scheduled(deliverySummary(c.delivery, DELIVERY_WORDS))
      : c.status === "sending"
        ? d.lines.sending
        : c.status === "sent"
          ? d.lines.sent(formatDateTime(c.sentAt))
          : c.status === "canceled"
            ? d.lines.canceled
            : d.lines.failed

  const refresh = () => {
    void CampaignsController.loadCampaign(c.id, true)
    void CampaignsController.loadStats(c.id, { force: true })
  }

  const deleteButton = (
    <Button
      variant="ghost"
      disabled={Boolean(busy) || live}
      className="text-destructive hover:text-destructive"
    >
      {busy === "delete" ? <Spinner /> : <Trash2 />}
      {d.delete}
    </Button>
  )

  return (
    <>
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate">{c.name}</span>
            <CampaignStatusBadge status={c.status} />
          </span>
        }
        description={
          <span>
            {line}
            {live ? <span className="text-xs"> · {d.autoRefresh}</span> : null}
          </span>
        }
        actions={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">
                <ArrowLeft />
                {d.back}
              </Link>
            </Button>
            <RefreshButton loading={loading} onRefresh={refresh} />
            {live ? (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" disabled={Boolean(busy)}>
                    {busy === "cancel" ? <Spinner /> : <CircleStop />}
                    {d.cancel}
                  </Button>
                }
                title={d.cancelTitle}
                description={d.cancelBody}
                confirmLabel={d.cancelConfirm}
                onConfirm={() => CampaignsController.cancel(c.id)}
              />
            ) : null}
            <Button
              variant="outline"
              disabled={Boolean(busy)}
              onClick={async () => {
                const copy = await CampaignsController.duplicate(c)
                if (copy) router.push(`/notifications/${copy.id}`)
              }}
            >
              {busy === "duplicate" ? <Spinner /> : <Copy />}
              {d.duplicate}
            </Button>
            {live ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{deleteButton}</span>
                </TooltipTrigger>
                <TooltipContent>{d.deleteLive}</TooltipContent>
              </Tooltip>
            ) : (
              <ConfirmDialog
                trigger={deleteButton}
                title={d.deleteTitle}
                description={d.deleteBody(c.name)}
                onConfirm={async () => {
                  const done = await CampaignsController.remove(c.id)
                  if (done) router.replace("/notifications")
                  return done
                }}
              />
            )}
          </>
        }
      />
      {live ? <NotificationsStatusBanner /> : null}
      <CampaignStatsCards campaign={c} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <LanguageBreakdown campaignId={c.id} />
          <SentMessages campaign={c} />
        </div>
        <div className="space-y-4">
          <CampaignFacts campaign={c} />
          <PushPreview
            messages={c.messages}
            source={source}
            imageUrl={c.imageUrl}
            language={language}
            onLanguage={setLanguage}
          />
        </div>
      </div>
    </>
  )
}
