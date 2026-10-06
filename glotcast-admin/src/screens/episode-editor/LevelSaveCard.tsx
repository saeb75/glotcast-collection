"use client"

import { Save, Trash2, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { LevelEditorController } from "@/controllers/LevelEditorController"
import { COMMON } from "@/copy/common"
import { LEVEL } from "@/copy/levels"
import { LEVEL_LABELS } from "@/copy/status"
import { formatClock, formatRelative } from "@/domain/format"
import { draftKey, isDirty, saveProblem } from "@/domain/levelDraft"
import { type Level } from "@/schemas/admin"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useLevelEditorStore } from "@/stores/useLevelEditorStore"

/** Step 4: the level's description, then save (PUT …/levels/:level) — or discard, or delete the level. ⌘S saves. */
export function LevelSaveCard({ episodeId, level }: { episodeId: string; level: Level }) {
  const key = draftKey(episodeId, level)
  const draft = useLevelEditorStore((s) => s.drafts[key])
  if (!draft) return null
  const dirty = isDirty(draft)
  const problem = saveProblem(draft)
  const label = LEVEL_LABELS[level]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {label}
          {dirty ? (
            <Badge variant="outline" className="text-warning">
              {COMMON.unsaved}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor={`${key}-description`}>{LEVEL.description}</FieldLabel>
          <Textarea
            id={`${key}-description`}
            rows={2}
            maxLength={2000}
            value={draft.description}
            onChange={(e) => LevelEditorController.setDescription(key, e.target.value)}
          />
          <FieldDescription>{LEVEL.descriptionHint}</FieldDescription>
        </Field>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            {draft.saved
              ? `${LEVEL.savedAt(formatRelative(draft.saved.updatedAt))} · ${formatClock(draft.saved.durationSec)} · ${LEVEL.transcribe.lines(draft.saved.chunkCount)}`
              : LEVEL.notSaved}
          </div>
          {dirty && problem && problem !== "busy" ? (
            <div className="text-destructive">{LEVEL.problems[problem]}</div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex-wrap gap-2 border-t">
        <SaveButton
          episodeId={episodeId}
          level={level}
          disabled={!dirty || problem !== null}
          saving={draft.saving}
        />
        {dirty && draft.saved ? (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" disabled={draft.saving}>
                <Undo2 />
                {LEVEL.discard}
              </Button>
            }
            title={LEVEL.discardTitle}
            description={LEVEL.discardBody}
            confirmLabel={LEVEL.discard}
            onConfirm={() => LevelEditorController.discard(key)}
          />
        ) : null}
        {draft.saved ? (
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                disabled={draft.saving || draft.deleting}
              >
                {draft.deleting ? <Spinner /> : <Trash2 />}
                {LEVEL.delete}
              </Button>
            }
            title={LEVEL.deleteTitle(label)}
            description={LEVEL.deleteBody}
            onConfirm={() => LevelEditorController.remove(episodeId, level)}
          />
        ) : null}
      </CardFooter>
    </Card>
  )
}

function SaveButton({
  episodeId,
  level,
  disabled,
  saving,
}: {
  episodeId: string
  level: Level
  disabled: boolean
  saving: boolean
}) {
  const save = () => void LevelEditorController.save(episodeId, level)
  useSaveShortcut(save, !disabled && !saving)
  return (
    <Button disabled={disabled || saving} onClick={save}>
      {saving ? <Spinner /> : <Save />}
      {LEVEL.save}
    </Button>
  )
}
