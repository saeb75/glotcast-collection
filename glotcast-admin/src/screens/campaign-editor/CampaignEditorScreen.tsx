"use client"

import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { CampaignEditorController, isEditorDirty, NEW_CAMPAIGN } from "@/controllers/CampaignEditorController"
import { PodcastsController } from "@/controllers/PodcastsController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { type AdminCampaign } from "@/schemas/admin"
import { CampaignStatusBadge } from "@/shared/CampaignStatusBadge"
import { NotificationsStatusBanner } from "@/shared/NotificationsStatusBanner"
import { PageHeader } from "@/shared/PageHeader"
import { PushPreview } from "@/shared/PushPreview"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"
import { useCampaignEditorStore } from "@/stores/useCampaignEditorStore"
import { AudienceCard } from "./AudienceCard"
import { ChecklistCard } from "./ChecklistCard"
import { DeliveryCard } from "./DeliveryCard"
import { ImageCard } from "./ImageCard"
import { LinkCard } from "./LinkCard"
import { MessageCard } from "./MessageCard"
import { SendDialog } from "./SendDialog"
import { TestSendButton } from "./TestSendButton"
import { TranslationsCard } from "./TranslationsCard"

/**
 * A draft campaign — new (`campaign` null) or saved: the message and its 16 languages, the audience and its
 * reach, the link, the image, the delivery; a live preview beside. Save, test on a phone, send.
 */
export function CampaignEditorScreen({ campaign }: { campaign: AdminCampaign | null }) {
  const router = useRouter()
  const key = campaign?.id ?? NEW_CAMPAIGN
  const editor = useCampaignEditorStore((s) => s.editors[key])
  const saving = useCampaignEditorStore((s) => s.saving[key] ?? false)
  const translating = useCampaignEditorStore((s) => s.translating[key] ?? false)
  const dirty = isEditorDirty(editor)
  const e = CAMPAIGNS.editor

  useEffect(() => {
    CampaignEditorController.open(key, campaign)
  }, [key, campaign])

  useEffect(() => {
    // The audience's and the link's podcast names.
    void PodcastsController.loadOptions()
  }, [])

  const save = async () => {
    const saved = await CampaignEditorController.save(key)
    if (saved && key === NEW_CAMPAIGN) router.replace(`/notifications/${saved.id}`)
  }

  useUnsavedGuard(dirty)
  useSaveShortcut(() => void save(), dirty && !saving)

  /** The send dialog or the test popover; a campaign never saved is created first (then opened on its page). */
  const openDialog = async (kind: "send" | "test") => {
    if (kind === "send" && !CampaignEditorController.prepareSend(key)) return
    if (key !== NEW_CAMPAIGN) return CampaignEditorController.setDialog({ key, kind })
    const saved = await CampaignEditorController.save(NEW_CAMPAIGN, true)
    if (!saved) return
    CampaignEditorController.setDialog({ key: saved.id, kind })
    router.replace(`/notifications/${saved.id}`)
  }

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/notifications">
        <ArrowLeft />
        {e.back}
      </Link>
    </Button>
  )

  if (!editor)
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    )

  const { draft } = editor
  return (
    <>
      <PageHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate">{draft.name.trim() || campaign?.name || e.newTitle}</span>
            {campaign ? <CampaignStatusBadge status={campaign.status} /> : null}
          </span>
        }
        description={e.subtitle}
        actions={
          <>
            {back}
            {dirty && editor.base ? (
              <Button variant="ghost" disabled={saving} onClick={() => CampaignEditorController.discard(key)}>
                {e.discard}
              </Button>
            ) : null}
            <TestSendButton editorKey={key} onOpen={() => void openDialog("test")} />
            <Button
              variant="outline"
              disabled={saving || (!dirty && editor.base !== null)}
              onClick={() => void save()}
            >
              {saving ? <Spinner /> : null}
              {e.save}
            </Button>
            <Button disabled={saving} onClick={() => void openDialog("send")}>
              <Send />
              {e.send}
            </Button>
          </>
        }
      />
      <NotificationsStatusBanner />
      {dirty ? (
        <div className="sticky top-16 z-10 rounded-lg border border-warning/40 bg-background/95 px-4 py-2 text-sm text-warning backdrop-blur">
          {e.unsaved}
        </div>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <MessageCard editorKey={key} editor={editor} translating={translating} />
          <TranslationsCard editorKey={key} editor={editor} />
          <AudienceCard editorKey={key} editor={editor} />
          <LinkCard editorKey={key} editor={editor} />
          <ImageCard editorKey={key} editor={editor} />
          <DeliveryCard editorKey={key} editor={editor} />
        </div>
        <div className="space-y-4 lg:sticky lg:top-20">
          <PushPreview
            messages={draft.messages}
            source={draft.sourceLanguage}
            imageUrl={draft.imageUrl}
            language={editor.previewLanguage}
            onLanguage={(language) => CampaignEditorController.setPreview(key, language)}
          />
          <ChecklistCard editor={editor} />
        </div>
      </div>
      <SendDialog editorKey={key} editor={editor} />
    </>
  )
}
