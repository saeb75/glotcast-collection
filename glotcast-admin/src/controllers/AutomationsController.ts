import { errorCode } from "@/api/errors"
import { getAutomations, getNotificationsStatus, putAutomations } from "@/api/notifications"
import { AUTOMATIONS } from "@/copy/automations"
import {
  type AutomationsForm,
  automationsForm,
  automationsFormValues,
  isAutomationsDirty,
} from "@/domain/automations"
import { withData } from "@/domain/cache"
import { fieldErrors } from "@/domain/forms"
import { automationsFormSchema } from "@/schemas/forms"
import { ToastService } from "@/services/ToastService"
import { useAutomationsStore } from "@/stores/useAutomationsStore"
import { loadEntry, toastFailure } from "./load"

const store = useAutomationsStore.getState
const MAX_AGE = 30_000

/** The errors of a form as it is now (shown as soon as a value is wrong: a time in quiet hours, a bad number). */
const errorsOf = (draft: AutomationsForm) => {
  const parsed = automationsFormSchema.safeParse(automationsFormValues(draft))
  return parsed.success ? {} : fieldErrors(parsed.error)
}

/** Whether pushes can go out, and the automations' switches and parameters — edited, then saved at once. */
export class AutomationsController {
  static async load(force = false): Promise<void> {
    const before = store().entry?.data
    const view = await loadEntry(
      () => store().entry,
      (e) => store().setEntry(e),
      getAutomations,
      MAX_AGE,
      force,
    )
    if (!view) return
    store().setStatus(withData(view.status))
    // Unsaved edits survive a reload; otherwise the screen shows what was loaded.
    if (!store().draft || !isAutomationsDirty(store().draft, before?.settings)) {
      store().setDraft(automationsForm(view.settings))
      store().setErrors({})
    }
  }

  /** OneSignal configured, NOTIFICATIONS_ENABLED, the last run (the banner on every notification page). */
  static async loadStatus(force = false): Promise<void> {
    await loadEntry(
      () => store().status,
      (e) => store().setStatus(e),
      getNotificationsStatus,
      MAX_AGE,
      force,
    )
  }

  static update<K extends keyof AutomationsForm>(section: K, patch: Partial<AutomationsForm[K]>): void {
    const draft = store().draft
    if (!draft) return
    const next = { ...draft, [section]: { ...draft[section], ...patch } }
    store().setDraft(next)
    store().setErrors(errorsOf(next))
  }

  static async save(): Promise<void> {
    const draft = store().draft
    if (!draft || store().saving) return
    const parsed = automationsFormSchema.safeParse(automationsFormValues(draft))
    if (!parsed.success) {
      store().setErrors(fieldErrors(parsed.error))
      return ToastService.error(AUTOMATIONS.fixErrors)
    }
    store().setSaving(true)
    try {
      const view = await putAutomations(parsed.data)
      store().setEntry(withData(view))
      store().setStatus(withData(view.status))
      store().setDraft(automationsForm(view.settings))
      store().setErrors({})
      ToastService.success(AUTOMATIONS.saved)
    } catch (error) {
      // A 400 names the fields (a slot time inside the quiet hours): shown where they are.
      const fields = errorCode(error).fields
      if (Object.keys(fields).length) store().setErrors({ ...store().errors, ...fields })
      toastFailure(error)
    } finally {
      store().setSaving(false)
    }
  }

  static discard(): void {
    const saved = store().entry?.data
    if (!saved) return
    store().setDraft(automationsForm(saved.settings))
    store().setErrors({})
  }

  static reset(): void {
    store().clear()
  }
}
