"use client"

import { Podcast } from "lucide-react"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { type AutomationsForm } from "@/domain/automations"
import { type AutomationsView } from "@/schemas/admin"
import { AutomationCard } from "./AutomationCard"
import { SettingField } from "./SettingField"

export function NewEpisodesCard({
  draft,
  errors,
  view,
}: {
  draft: AutomationsForm
  errors: Record<string, string>
  view: AutomationsView
}) {
  const n = AUTOMATIONS.newEpisodes
  const set = (patch: Partial<AutomationsForm["newEpisodes"]>) =>
    AutomationsController.update("newEpisodes", patch)
  return (
    <AutomationCard
      kind="new_episodes"
      icon={Podcast}
      title={n.title}
      who={n.who}
      what={n.what}
      enabled={draft.newEpisodes.enabled}
      onEnabled={(enabled) => set({ enabled })}
      view={view}
    >
      <SettingField
        id="new-debounce"
        type="number"
        label={n.debounce}
        hint={n.debounceHint}
        unit={AUTOMATIONS.units.minutes}
        error={errors["newEpisodes.debounceMin"]}
        value={draft.newEpisodes.debounceMin}
        onChange={(debounceMin) => set({ debounceMin })}
      />
      <SettingField
        id="new-fresh"
        type="number"
        label={n.fresh}
        hint={n.freshHint}
        unit={AUTOMATIONS.units.hours}
        error={errors["newEpisodes.freshHours"]}
        value={draft.newEpisodes.freshHours}
        onChange={(freshHours) => set({ freshHours })}
      />
    </AutomationCard>
  )
}
