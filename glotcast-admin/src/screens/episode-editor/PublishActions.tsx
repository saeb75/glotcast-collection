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
import { NotifyFollowersField } from "./NotifyFollowersField"
import { ScheduleDialog } from "./ScheduleDialog"

/** Publish now · schedule · unpublish, depending on where the episode is. */
export function PublishActions({ episode }: { episode: AdminEpisodeDetail }) {
  const busy = useEpisodesStore((s) => s.busy[episode.id])
  const [scheduling, setScheduling] = useState(false)
  const [notify, setNotify] = useState(episode.notifyFollowers)
  const e = EPISODES.editor
  const live = episode.status === "published"

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
      {live ? null : (
        <ConfirmDialog
          trigger={
            <Button disabled={Boolean(busy)} onClick={() => setNotify(episode.notifyFollowers)}>
              {busy === "publish" ? <Spinner /> : <CircleCheck />}
              {e.publish}
            </Button>
          }
          title={e.publishTitle}
          description={episode.levels.length === 0 ? e.publishNoLevels : e.publishBody}
          confirmLabel={e.publish}
          destructive={false}
          onConfirm={async () =>
            Boolean(
              await EpisodesController.publish(episode.id, episode.followersNotifiedAt ? undefined : notify),
            )
          }
        >
          <NotifyFollowersField
            id="publish-notify"
            checked={notify}
            onChange={setNotify}
            notifiedAt={episode.followersNotifiedAt}
          />
        </ConfirmDialog>
      )}
      {scheduling ? (
        <ScheduleDialog
          episodeId={episode.id}
          current={episode.status === "scheduled" ? episode.publishedAt : null}
          notifyFollowers={episode.notifyFollowers}
          notifiedAt={episode.followersNotifiedAt}
          open={scheduling}
          onOpenChange={setScheduling}
        />
      ) : null}
    </>
  )
}
