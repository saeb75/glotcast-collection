"use client"

import { Flame } from "lucide-react"
import { AutomationsController } from "@/controllers/AutomationsController"
import { AUTOMATIONS } from "@/copy/automations"
import { type AutomationsForm } from "@/domain/automations"
import { type AutomationsView } from "@/schemas/admin"
import { AutomationCard } from "./AutomationCard"
import { SettingField } from "./SettingField"

export function StreakSaverCard({
  draft,
  errors,
  view,
}: {
  draft: AutomationsForm
  errors: Record<string, string>
  view: AutomationsView
}) {
  const s = AUTOMATIONS.streakSaver
  const set = (patch: Partial<AutomationsForm["streakSaver"]>) =>
    AutomationsController.update("streakSaver", patch)
  return (
    <AutomationCard
      kind="streak_saver"
      icon={Flame}
      title={s.title}
      who={s.who}
      what={s.what}
      enabled={draft.streakSaver.enabled}
      onEnabled={(enabled) => set({ enabled })}
      view={view}
    >
      <SettingField
        id="streak-time"
        type="time"
        label={s.time}
        hint={s.timeHint}
        error={errors["streakSaver.time"]}
        value={draft.streakSaver.time}
        onChange={(time) => set({ time })}
      />
      <SettingField
        id="streak-min"
        type="number"
        label={s.minStreak}
        hint={s.minStreakHint}
        unit={AUTOMATIONS.units.days}
        error={errors["streakSaver.minStreak"]}
        value={draft.streakSaver.minStreak}
        onChange={(minStreak) => set({ minStreak })}
      />
    </AutomationCard>
  )
}
