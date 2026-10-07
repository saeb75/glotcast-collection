"use client"

import { AlarmClock } from "lucide-react"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { type AutomationsForm } from "@/domain/automations"
import { type AutomationsView } from "@/schemas/admin"
import { AutomationCard } from "./AutomationCard"
import { SettingField } from "./SettingField"

export function ReminderCard({
  draft,
  errors,
  view,
}: {
  draft: AutomationsForm
  errors: Record<string, string>
  view: AutomationsView
}) {
  const r = AUTOMATIONS.reminder
  const set = (patch: Partial<AutomationsForm["reminder"]>) => AutomationsController.update("reminder", patch)
  return (
    <AutomationCard
      kind="reminder"
      icon={AlarmClock}
      title={r.title}
      who={r.who}
      what={r.what}
      enabled={draft.reminder.enabled}
      onEnabled={(enabled) => set({ enabled })}
      view={view}
    >
      <Field orientation="horizontal" className="sm:col-span-2">
        <FieldContent>
          <FieldLabel htmlFor="reminder-recap">{r.weeklyRecap}</FieldLabel>
          <FieldDescription>{r.weeklyRecapHint}</FieldDescription>
        </FieldContent>
        <Switch
          id="reminder-recap"
          checked={draft.reminder.weeklyRecap}
          onCheckedChange={(weeklyRecap) => set({ weeklyRecap })}
        />
      </Field>
      <SettingField
        id="reminder-min-due"
        type="number"
        label={r.minDue}
        hint={r.minDueHint}
        unit={AUTOMATIONS.units.words}
        error={errors["reminder.minDue"]}
        value={draft.reminder.minDue}
        onChange={(minDue) => set({ minDue })}
      />
    </AutomationCard>
  )
}
