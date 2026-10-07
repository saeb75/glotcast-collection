"use client"

import { ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { linksEpisode } from "@/domain/campaign"
import { ImageField } from "@/shared/ImageField"
import { type CampaignEditor, useCampaignEditorStore } from "@/stores/useCampaignEditorStore"

/** The optional big image (uploaded to R2 or pasted); the linked episode's cover is one click away. */
export function ImageCard({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const { link, imageUrl } = editor.draft
  const cover = useCampaignEditorStore((s) =>
    linksEpisode(link.type) && link.id ? s.episodes[link.id]?.coverUrl : undefined,
  )
  const error = editor.errors.imageUrl
  const i = CAMPAIGNS.editor.image

  return (
    <Card>
      <CardHeader>
        <CardTitle>{i.title}</CardTitle>
        <CardDescription>{i.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ImageField
          id="campaign-image"
          aspect="landscape"
          value={imageUrl}
          invalid={Boolean(error)}
          onChange={(url) => CampaignEditorController.setImage(editorKey, url)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
        {cover && cover !== imageUrl ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => CampaignEditorController.setImage(editorKey, cover)}
          >
            <ImagePlus />
            {i.useCover}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
