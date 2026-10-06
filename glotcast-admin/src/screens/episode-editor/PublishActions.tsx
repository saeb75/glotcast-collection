"use client"

import { CalendarClock, CircleCheck, CircleDashed } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { EpisodesController } from "@/controllers/EpisodesController"
import { EPISODES } from "@/copy/episodes"
import { type AdminEpisodeDetail } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { ScheduleDialog } from "./ScheduleDialog"

/** Publish now · schedule · unpublish, depending on where the episode is. */
export function PublishActions({ episode }: { episode: AdminEpisodeDetail }) {
  const busy = useEpisodesStore((s) => s.busy[episode.id])
  const [scheduling, setScheduling] = useState(false)
  const e = EPISODES.editor
  const live = episode.status === "published"

  const publish = (
    <Button disabled={Boolean(busy)} onClick={() => void EpisodesController.publish(episode.id)}>
      {busy === "publish" ? <Spinner /> : <CircleCheck />}
      {e.publish}
    </Button>
  )

  return (
    <>
      {live ? null : (
        <Button variant="outline" disabled={Boolean(busy)} onClick={() => setScheduling(true)}>
          <CalendarClock />
          {episode.status === "scheduled" ? e.reschedule : e.schedule}
        </Button>
      )}
      {episode.status !== "draft" ? (
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={Boolean(busy)}>
              {busy === "unpublish" ? <Spinner /> : <CircleDashed />}
              {e.unpublish}
            </Button>
          }
          title={e.unpublishTitle}
          description={e.unpublishBody}
          confirmLabel={e.unpublish}
          onConfirm={async () => Boolean(await EpisodesController.unpublish(episode.id))}
        />
      ) : null}
      {live ? null : episode.levels.length === 0 ? (
        <ConfirmDialog
          trigger={
            <Button disabled={Boolean(busy)}>
              <CircleCheck />
              {e.publish}
            </Button>
          }
          title={e.publish}
          description={e.publishNoLevels}
          confirmLabel={e.publish}
          destructive={false}
          onConfirm={async () => Boolean(await EpisodesController.publish(episode.id))}
        />
      ) : (
        publish
      )}
      {scheduling ? (
        <ScheduleDialog
          episodeId={episode.id}
          current={episode.status === "scheduled" ? episode.publishedAt : null}
          open={scheduling}
          onOpenChange={setScheduling}
        />
      ) : null}
    </>
  )
}
