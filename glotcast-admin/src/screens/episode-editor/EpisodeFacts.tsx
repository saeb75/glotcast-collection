"use client"

import { Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { EpisodesController } from "@/controllers/EpisodesController"
import { EPISODES } from "@/copy/episodes"
import { formatDateTime } from "@/domain/format"
import { type AdminEpisodeDetail } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { CopyButton } from "@/shared/CopyButton"
import { DetailItem } from "@/shared/DetailItem"
import { LevelBadges } from "@/shared/LevelBadges"
import { StatusBadge } from "@/shared/StatusBadge"

/** Where the episode stands; delete it. */
export function EpisodeFacts({ episode: ep }: { episode: AdminEpisodeDetail }) {
  const router = useRouter()
  const f = EPISODES.editor.facts

  return (
    <Card>
      <CardHeader>
        <CardTitle>{EPISODES.podcastLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <DetailItem label={EPISODES.podcastLabel}>
            <Link href={`/podcasts/${ep.podcast.id}`} className="hover:underline">
              {ep.podcast.name}
            </Link>
          </DetailItem>
          <DetailItem label={f.status}>
            <StatusBadge status={ep.status} />
          </DetailItem>
          {ep.publishedAt ? (
            <DetailItem label={f.publishedAt}>{formatDateTime(ep.publishedAt)}</DetailItem>
          ) : null}
          <DetailItem label={EPISODES.columns.levels}>
            <span className="inline-flex justify-end">
              <LevelBadges levels={ep.levels} />
            </span>
          </DetailItem>
          <DetailItem label={f.created}>{formatDateTime(ep.createdAt)}</DetailItem>
          <DetailItem label={f.updated}>{formatDateTime(ep.updatedAt)}</DetailItem>
          <DetailItem label={f.id}>
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {ep.id.slice(0, 8)}
              <CopyButton value={ep.id} />
            </span>
          </DetailItem>
          {ep.legacyDocumentId ? (
            <DetailItem label={f.legacy}>
              <span className="font-mono text-xs">{ep.legacyDocumentId}</span>
            </DetailItem>
          ) : null}
        </dl>
      </CardContent>
      <CardFooter className="border-t">
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
              <Trash2 />
              {EPISODES.editor.delete}
            </Button>
          }
          title={EPISODES.editor.deleteTitle}
          description={EPISODES.editor.deleteBody(ep.title)}
          onConfirm={async () => {
            const done = await EpisodesController.remove(ep.id)
            if (done) router.replace("/episodes")
            return done
          }}
        />
      </CardFooter>
    </Card>
  )
}
