"use client"

import { EpisodesController } from "@/controllers/EpisodesController"
import { COVERS } from "@/copy/covers"
import { EPISODES } from "@/copy/episodes"
import { LEVEL_LABELS } from "@/copy/status"
import { draftKey } from "@/domain/levelDraft"
import { LEVELS } from "@/domain/levels"
import { plainText } from "@/domain/transcript"
import { type AdminEpisodeDetail } from "@/schemas/admin"
import { CoverGenerator } from "@/shared/CoverGenerator"
import { CoverThumb } from "@/shared/CoverThumb"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"

/** The cover generator over this episode's transcripts (unsaved ones too); results become the cover or banner. */
export function CoverTab({ episode }: { episode: AdminEpisodeDetail }) {
  const drafts = useLevelEditorStore((s) => s.drafts)
  const sources = LEVELS.flatMap((level) => {
    const chunks = drafts[draftKey(episode.id, level)]?.chunks ?? []
    return chunks.length ? [{ id: level, label: COVERS.sourceLevel(LEVEL_LABELS[level]), text: plainText(chunks) }] : []
  })
  const sessionKey = `episode:${episode.id}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <figure className="space-y-1">
          <CoverThumb url={episode.coverUrl} alt="" aspect="portrait" className="w-24" />
          <figcaption className="text-xs text-muted-foreground">{EPISODES.form.cover}</figcaption>
        </figure>
        <figure className="space-y-1">
          <CoverThumb url={episode.bannerUrl} alt="" aspect="landscape" className="w-32" />
          <figcaption className="text-xs text-muted-foreground">{EPISODES.form.banner}</figcaption>
        </figure>
      </div>
      <CoverGenerator
        sessionKey={sessionKey}
        podcastName={episode.podcast.name}
        title={episode.title}
        sources={sources}
        emptyHint={COVERS.noSource}
        actions={[
          {
            label: COVERS.useAsCover,
            onUse: (url) => EpisodesController.update(episode.id, { coverUrl: url }, COVERS.used(EPISODES.form.cover.toLowerCase())),
          },
          {
            label: COVERS.useAsBanner,
            onUse: (url) =>
              EpisodesController.update(episode.id, { bannerUrl: url }, COVERS.used(EPISODES.form.banner.toLowerCase())),
          },
        ]}
      />
    </div>
  )
}
