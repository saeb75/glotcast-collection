"use client"

import { Info } from "lucide-react"
import { useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { isAutomationsDirty } from "@/domain/automations"
import { ErrorState } from "@/shared/ErrorState"
import { NotificationsStatusBanner } from "@/shared/NotificationsStatusBanner"
import { PageHeader } from "@/shared/PageHeader"
import { RefreshButton } from "@/shared/RefreshButton"
import { useSaveShortcut } from "@/shared/useSaveShortcut"
import { useUnsavedGuard } from "@/shared/useUnsavedGuard"
import { useAutomationsStore } from "@/stores/useAutomationsStore"
import { LearningCard } from "./LearningCard"
import { NewEpisodesCard } from "./NewEpisodesCard"
import { QuietHoursCard } from "./QuietHoursCard"
import { ReminderCard } from "./ReminderCard"
import { SchedulerStatus } from "./SchedulerStatus"
import { StreakSaverCard } from "./StreakSaverCard"

/** The automated pushes: on/off and their parameters, the quiet hours, the scheduler — edited, then saved. */
export function AutomationsScreen() {
  const entry = useAutomationsStore((s) => s.entry)
  const draft = useAutomationsStore((s) => s.draft)
  const errors = useAutomationsStore((s) => s.errors)
  const saving = useAutomationsStore((s) => s.saving)
  const view = entry?.data
  const dirty = isAutomationsDirty(draft, view?.settings)
  const invalid = Object.keys(errors).length > 0

  useUnsavedGuard(dirty)
  useSaveShortcut(() => void AutomationsController.save(), dirty && !saving)

  useEffect(() => {
    void AutomationsController.load()
  }, [])

  const actions = (
    <>
      {dirty ? (
        <Button variant="ghost" disabled={saving} onClick={() => AutomationsController.discard()}>
          {AUTOMATIONS.discard}
        </Button>
      ) : (
        <RefreshButton loading={entry?.loading} onRefresh={() => void AutomationsController.load(true)} />
      )}
      <Button disabled={!dirty || saving || invalid} onClick={() => void AutomationsController.save()}>
        {saving ? <Spinner /> : null}
        {AUTOMATIONS.save}
      </Button>
    </>
  )

  return (
    <>
      <PageHeader title={AUTOMATIONS.title} description={AUTOMATIONS.subtitle} actions={actions} />
      <NotificationsStatusBanner />
      {dirty ? (
        <div className="sticky top-16 z-10 rounded-lg border border-warning/40 bg-background/95 px-4 py-2 text-sm text-warning backdrop-blur">
          {invalid ? AUTOMATIONS.fixErrors : AUTOMATIONS.unsaved}
        </div>
      ) : null}
      {entry?.error && !view ? (
        <ErrorState message={entry.error} onRetry={() => void AutomationsController.load(true)} />
      ) : !view || !draft ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <SchedulerStatus view={view} />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <QuietHoursCard draft={draft} errors={errors} />
            <Alert>
              <Info />
              <AlertDescription>{AUTOMATIONS.caps}</AlertDescription>
            </Alert>
            <ReminderCard draft={draft} errors={errors} view={view} />
            <StreakSaverCard draft={draft} errors={errors} view={view} />
            <LearningCard draft={draft} errors={errors} view={view} />
            <NewEpisodesCard draft={draft} errors={errors} view={view} />
          </div>
        </>
      )}
    </>
  )
}
