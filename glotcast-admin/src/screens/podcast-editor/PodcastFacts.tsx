"use client"

import { Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PodcastsController } from "@/controllers/PodcastsController"
import { COMMON } from "@/copy/common"
import { PODCASTS } from "@/copy/podcasts"
import { formatDateTime } from "@/domain/format"
import { type AdminPodcast } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { CopyButton } from "@/shared/CopyButton"
import { DetailItem } from "@/shared/DetailItem"
import { StatusBadge } from "@/shared/StatusBadge"

/** Status, counts and dates; the episodes link; delete (refused by the API while it has episodes). */
export function PodcastFacts({ podcast: p }: { podcast: AdminPodcast }) {
  const router = useRouter()
  const e = PODCASTS.editor
  const blocked = p.episodeCount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{e.facts}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <DetailItem label={PODCASTS.columns.status}>
            <StatusBadge status={p.status} />
          </DetailItem>
          <DetailItem label={e.episodeCount}>
            <Link href={`/episodes?podcast=${p.id}`} className="hover:underline">
              {PODCASTS.episodes(p.publishedEpisodeCount, p.episodeCount)}
            </Link>
          </DetailItem>
          {p.publishedAt ? (
            <DetailItem label={e.publishedAt}>{formatDateTime(p.publishedAt)}</DetailItem>
          ) : null}
          <DetailItem label={e.createdAt}>{formatDateTime(p.createdAt)}</DetailItem>
          <DetailItem label={e.updatedAt}>{formatDateTime(p.updatedAt)}</DetailItem>
          <DetailItem label="ID">
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {p.id.slice(0, 8)}
              <CopyButton value={p.id} />
            </span>
          </DetailItem>
          {p.legacyDocumentId ? (
            <DetailItem label={e.legacy}>
              <span className="font-mono text-xs">{p.legacyDocumentId}</span>
            </DetailItem>
          ) : null}
        </dl>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t">
        <Button variant="outline" asChild>
          <Link href={`/episodes?podcast=${p.id}`}>{e.viewEpisodes}</Link>
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 />
              {COMMON.delete}
            </Button>
          }
          title={e.deleteTitle}
          description={blocked ? e.deleteBlocked(p.episodeCount) : e.deleteBody(p.name)}
          onConfirm={async () => {
            if (blocked) return false
            const done = await PodcastsController.remove(p.id)
            if (done) router.replace("/podcasts")
            return done
          }}
        />
      </CardFooter>
    </Card>
  )
}
