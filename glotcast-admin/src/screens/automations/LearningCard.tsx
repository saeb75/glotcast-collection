"use client"

import { GraduationCap } from "lucide-react"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { type AutomationsForm } from "@/domain/automations"
import { type AutomationsView } from "@/schemas/admin"
import { AutomationCard } from "./AutomationCard"
import { SettingField } from "./SettingField"

export function LearningCard({
  draft,
  errors,
  view,
}: {
  draft: AutomationsForm
  errors: Record<string, string>
  view: AutomationsView
}) {
  const l = AUTOMATIONS.learning
  const set = (patch: Partial<AutomationsForm["learning"]>) => AutomationsController.update("learning", patch)
  return (
    <AutomationCard
      kind="learning"
      icon={GraduationCap}
      title={l.title}
      who={l.who}
      what={l.what}
      enabled={draft.learning.enabled}
      onEnabled={(enabled) => set({ enabled })}
      view={view}
    >
      <SettingField
        id="learning-time"
        type="time"
        label={l.time}
        hint={l.timeHint}
        error={errors["learning.time"]}
        value={draft.learning.time}
        onChange={(time) => set({ time })}
      />
    </AutomationCard>
  )
}
