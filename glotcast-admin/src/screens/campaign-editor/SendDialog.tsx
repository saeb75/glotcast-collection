"use client"

import { CircleAlert } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CampaignEditorController } from "@/controllers/CampaignEditorController"
import { CAMPAIGNS } from "@/copy/campaigns"
import { AUDIENCE_WORDS, DELIVERY_WORDS } from "@/copy/notifications"
import {
  audienceInput,
  audienceKey,
  audienceSummary,
  deliveryInput,
  deliverySummary,
} from "@/domain/campaign"
import { formatCount } from "@/domain/format"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { type CampaignEditor, useCampaignEditorStore } from "@/stores/useCampaignEditorStore"
import { useAutomationsStore } from "@/stores/useAutomationsStore"
import { usePodcastsStore } from "@/stores/usePodcastsStore"

/** "Send this campaign?" with who (the reachable count, counted afresh) and when; refusals are shown inside. */
export function SendDialog({ editorKey, editor }: { editorKey: string; editor: CampaignEditor }) {
  const open = useCampaignEditorStore((s) => s.dialog?.key === editorKey && s.dialog.kind === "send")
  const audience = useMemo(() => audienceInput(editor.draft.audience), [editor.draft.audience])
  const key = audienceKey(audience)
  const reach = useCampaignEditorStore((s) => s.reach[key])
  const quietTo = useAutomationsStore((s) => s.entry?.data?.settings.quietHours.to) ?? "08:00"
  const podcasts = usePodcastsStore((s) => s.options?.data)
  const [error, setError] = useState<string | null>(null)
  const delivery = deliveryInput(editor.delivery)
  const s = CAMPAIGNS.editor.sendDialog

  useEffect(() => {
    if (open) void CampaignEditorController.reach(JSON.parse(key), true)
  }, [open, key])

  const reachable = reach?.data && !reach.loading ? reach.data.reachable : undefined
  const description =
    reachable === undefined ? s.reachLoading : reachable === 0 ? s.nobody : s.reach(formatCount(reachable))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return
        CampaignEditorController.setDialog(null)
        setError(null)
      }}
      title={s.title}
      description={description}
      confirmLabel={delivery?.mode === "now" ? s.sendNow : s.schedule}
      destructive={false}
      onConfirm={async () => {
        setError(null)
        const outcome = await CampaignEditorController.send(editorKey)
        if (!outcome.ok) setError(outcome.message)
        return outcome.ok
      }}
    >
      <dl className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
          <dt className="text-muted-foreground">{s.when}</dt>
          <dd className="font-medium">
            {delivery ? deliverySummary(delivery, DELIVERY_WORDS) : s.noDelivery}
          </dd>
        </div>
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
          <dt className="text-muted-foreground">{s.audience}</dt>
          <dd>
            {audienceSummary(audience, AUDIENCE_WORDS, (id) => podcasts?.find((p) => p.id === id)?.name)}
          </dd>
        </div>
        <p className="text-xs text-muted-foreground">
          {editor.draft.respectQuietHours ? s.quietOn(quietTo) : s.quietOff}
        </p>
      </dl>
      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </ConfirmDialog>
  )
}
