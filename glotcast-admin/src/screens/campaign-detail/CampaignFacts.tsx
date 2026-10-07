"use client"

import { ListChecks } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { AUDIENCE_WORDS, DELIVERY_WORDS, NOTIFY } from "@/copy/notifications"
import { LEVEL_LABELS } from "@/copy/status"
import { audienceSummary, deliverySummary, linksEpisode } from "@/domain/campaign"
import { episodeLabel, formatDateTime } from "@/domain/format"
import { type AdminCampaign } from "@/schemas/admin"
import { CopyButton } from "@/shared/CopyButton"
import { CoverThumb } from "@/shared/CoverThumb"
import { DetailItem } from "@/shared/DetailItem"
import { useCampaignEditorStore } from "@/stores/useCampaignEditorStore"
import { usePodcastsStore } from "@/stores/usePodcastsStore"

/** Who it was for, what a tap opens, when it went, who made it. */
export function CampaignFacts({ campaign: c }: { campaign: AdminCampaign }) {
  const podcasts = usePodcastsStore((s) => s.options?.data)
  const episode = useCampaignEditorStore((s) => (c.link.id ? s.episodes[c.link.id] : undefined))
  const f = CAMPAIGNS.detail.facts
  const podcastName = (id: string) => podcasts?.find((p) => p.id === id)?.name

  useEffect(() => {
    if (linksEpisode(c.link.type) && c.link.id) void CampaignEditorController.resolveEpisode(c.link.id)
  }, [c.link.type, c.link.id])

  const target =
    linksEpisode(c.link.type) && c.link.id ? (
      episode ? (
        <Link href={`/episodes/${episode.id}`} className="hover:underline">
          {episodeLabel(episode)}
        </Link>
      ) : (
        "…"
      )
    ) : c.link.type === "podcast" && c.link.id ? (
      <Link href={`/podcasts/${c.link.id}`} className="hover:underline">
        {podcastName(c.link.id) ?? "…"}
      </Link>
    ) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{f.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <DetailItem label={f.audience}>
            {audienceSummary(c.audience, AUDIENCE_WORDS, podcastName)}
          </DetailItem>
          <DetailItem label={f.link}>
            {NOTIFY.linkTypes[c.link.type]}
            {target ? <span className="block font-normal">{target}</span> : null}
            {c.link.level ? (
              <span className="block text-xs font-normal text-muted-foreground">
                {LEVEL_LABELS[c.link.level]}
              </span>
            ) : null}
          </DetailItem>
          <DetailItem label={f.delivery}>{deliverySummary(c.delivery, DELIVERY_WORDS)}</DetailItem>
          <DetailItem label={f.quietHours}>{c.respectQuietHours ? f.quietOn : f.quietOff}</DetailItem>
          <DetailItem label={f.image}>
            {c.imageUrl ? (
              <span className="inline-flex justify-end">
                <CoverThumb url={c.imageUrl} alt="" aspect="landscape" className="w-20" />
              </span>
            ) : (
              <span className="font-normal text-muted-foreground">{f.noImage}</span>
            )}
          </DetailItem>
          {c.sentAt ? <DetailItem label={f.sentAt}>{formatDateTime(c.sentAt)}</DetailItem> : null}
          <DetailItem label={f.createdBy}>{c.createdBy?.email ?? "—"}</DetailItem>
          <DetailItem label={f.created}>{formatDateTime(c.createdAt)}</DetailItem>
          <DetailItem label={f.id}>
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {c.id.slice(0, 8)}
              <CopyButton value={c.id} />
            </span>
          </DetailItem>
        </dl>
      </CardContent>
      <CardFooter className="border-t">
        <Button variant="ghost" className="w-full" asChild>
          <Link href={`/send-log?campaign=${c.id}`}>
            <ListChecks />
            {f.sendLog}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
