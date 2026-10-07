import { errorCode } from "@/api/errors"
import { findEpisodes } from "@/api/episodes"
import {
  createCampaign,
  getReach,
  sendCampaign,
  testCampaign,
  translateMessage,
  updateCampaign,
} from "@/api/notifications"
import { CAMPAIGNS } from "@/copy/campaigns"
import { ERRORS } from "@/copy/common"
import { DELIVERY_WORDS } from "@/copy/notifications"
import {
  type AudienceDraft,
  audienceKey,
  campaignFormValues,
  campaignInput,
  campaignPatch,
  type DeliveryDraft,
  defaultDelivery,
  deliveryInput,
  deliveryProblem,
  deliverySummary,
  draftFromCampaign,
  type LinkDraft,
  LOCALES,
  type MessageDraft,
  messageProblem,
  newCampaignDraft,
  sameDraft,
  sendFailure,
  testFailure,
  withLinkType,
} from "@/domain/campaign"
import { fieldErrors } from "@/domain/forms"
import {
  type AdminCampaign,
  type AdminEpisode,
  type Audience,
  type CampaignSource,
  type Locale,
  type PushLinkType,
  type Reach,
  type TestInput,
} from "@/schemas/admin"
import { campaignFormSchema } from "@/schemas/forms"
import { ToastService } from "@/services/ToastService"
import {
  type CampaignEditor,
  type EditorDialog,
  useCampaignEditorStore,
} from "@/stores/useCampaignEditorStore"
import { useCampaignsStore } from "@/stores/useCampaignsStore"
import { useEpisodesStore } from "@/stores/useEpisodesStore"
import { usePickerStore } from "@/stores/usePickerStore"
import { CampaignsController } from "./CampaignsController"
import { loadEntry, runAction, toastFailure } from "./load"

const store = useCampaignEditorStore.getState
const REACH_AGE = 30_000

/** The editor of a campaign not created yet. */
export const NEW_CAMPAIGN = "new"

export type Outcome = { ok: true; message: string } | { ok: false; message: string }

const freshEditor = (campaign: AdminCampaign | null): CampaignEditor => {
  const draft = campaign ? draftFromCampaign(campaign) : newCampaignDraft()
  return {
    base: campaign ? draftFromCampaign(campaign) : null,
    draft,
    delivery: defaultDelivery(new Date()),
    machine: {},
    translatedFrom: null,
    errors: {},
    previewLanguage: draft.sourceLanguage,
  }
}

/** Edited since the last save (a new campaign: anything typed at all). */
export const isEditorDirty = (e: CampaignEditor | undefined) =>
  Boolean(e && !sameDraft(e.draft, e.base ?? newCampaignDraft()))

const without = (errors: Record<string, string>, prefixes: string[]) =>
  Object.fromEntries(Object.entries(errors).filter(([key]) => !prefixes.some((p) => key.startsWith(p))))

/** The API's own words for a failure when it said something, else what the code means. */
const detailOf = (error: unknown) => {
  const failure = errorCode(error)
  const meaning = ERRORS[failure.code]
  return { failure, text: failure.status && failure.message !== meaning ? failure.message : meaning }
}

/**
 * A campaign draft being edited, keyed by its id (`NEW_CAMPAIGN` before the first save): the messages and
 * their translations, the audience and its reach, the link, the delivery; save, send, test.
 */
export class CampaignEditorController {
  private static lookingUp = new Set<string>()

  /** Creates the editor once; a clean editor follows a reloaded campaign, unsaved edits stay. */
  static open(key: string, campaign: AdminCampaign | null): void {
    const current = store().editors[key]
    if (!current) return store().setEditor(key, freshEditor(campaign))
    if (!campaign || isEditorDirty(current)) return
    const base = draftFromCampaign(campaign)
    if (current.base && sameDraft(base, current.base)) return
    store().setEditor(key, { ...current, base, draft: base, errors: {} })
  }

  private static edit(
    key: string,
    change: (e: CampaignEditor) => Partial<CampaignEditor>,
    clear: string[] = [],
  ): void {
    const e = store().editors[key]
    if (!e) return
    store().setEditor(key, { ...e, errors: clear.length ? without(e.errors, clear) : e.errors, ...change(e) })
  }

  static setName(key: string, name: string): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, name } }), ["name"])
  }

  static setSource(key: string, sourceLanguage: CampaignSource): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, sourceLanguage }, previewLanguage: sourceLanguage }))
  }

  static setMessage(key: string, locale: Locale, field: keyof MessageDraft, value: string): void {
    this.edit(
      key,
      (e) => ({
        draft: {
          ...e.draft,
          messages: { ...e.draft.messages, [locale]: { ...e.draft.messages[locale], [field]: value } },
        },
      }),
      [`messages.${locale}.`],
    )
  }

  /** Back to the last machine translation of that language. */
  static resetMessage(key: string, locale: Locale): void {
    const machine = store().editors[key]?.machine[locale]
    if (!machine) return
    this.edit(
      key,
      (e) => ({ draft: { ...e.draft, messages: { ...e.draft.messages, [locale]: { ...machine } } } }),
      [`messages.${locale}.`],
    )
  }

  static setAudience(key: string, patch: Partial<AudienceDraft>): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, audience: { ...e.draft.audience, ...patch } } }), [
      "audience.",
    ])
  }

  static setLinkType(key: string, type: PushLinkType): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, link: withLinkType(e.draft.link, type) } }), ["link."])
  }

  static setLink(key: string, patch: Partial<LinkDraft>): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, link: { ...e.draft.link, ...patch } } }), ["link."])
  }

  /** The picker chose the linked episode (known now: no lookup needed). */
  static pickEpisode(key: string, episode: AdminEpisode): void {
    store().addEpisodes([episode])
    this.setLink(key, { id: episode.id })
  }

  static setImage(key: string, imageUrl: string | null): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, imageUrl } }), ["imageUrl"])
  }

  static setRespectQuietHours(key: string, respectQuietHours: boolean): void {
    this.edit(key, (e) => ({ draft: { ...e.draft, respectQuietHours } }))
  }

  static setDelivery(key: string, patch: Partial<DeliveryDraft>): void {
    this.edit(key, (e) => ({ delivery: { ...e.delivery, ...patch } }), ["delivery"])
  }

  static setPreview(key: string, previewLanguage: Locale): void {
    this.edit(key, () => ({ previewLanguage }))
  }

  static discard(key: string): void {
    this.edit(key, (e) => ({ draft: e.base ?? newCampaignDraft(), errors: {} }))
  }

  static forget(key: string): void {
    store().setEditor(key, undefined)
  }

  /** The source message in every other app language (a hand-edited language is replaced too). */
  static async translate(key: string): Promise<void> {
    const e = store().editors[key]
    if (!e || store().translating[key]) return
    const source = e.draft.sourceLanguage
    const message = e.draft.messages[source]
    if (messageProblem(message) !== null) return
    const title = message.title.trim()
    const body = message.body.trim()
    store().setTranslating(key, true)
    try {
      const result = await runAction(
        () => translateMessage({ source, title, body }),
        CAMPAIGNS.editor.message.translated,
      )
      const current = store().editors[key]
      if (!result || !current) return
      const machine: Partial<Record<Locale, MessageDraft>> = {}
      const messages = { ...current.draft.messages }
      for (const locale of LOCALES) {
        const m = result.messages[locale]
        if (!m || locale === source) continue
        machine[locale] = { title: m.title, body: m.body }
        messages[locale] = { title: m.title, body: m.body }
      }
      store().setEditor(key, {
        ...current,
        draft: { ...current.draft, messages },
        machine,
        translatedFrom: { source, title, body },
        errors: without(
          current.errors,
          LOCALES.filter((l) => l !== source).map((l) => `messages.${l}.`),
        ),
      })
    } finally {
      store().setTranslating(key, false)
    }
  }

  /** How many users the audience matches and reaches (cached 30 s per audience). */
  static async reach(audience: Audience, force = false): Promise<Reach | undefined> {
    const key = audienceKey(audience)
    await loadEntry(
      () => store().reach[key],
      (e) => store().setReach(key, e),
      () => getReach(audience),
      REACH_AGE,
      force,
    )
    const reach = store().reach[key]?.data
    if (reach) store().setReachShownKey(key)
    return reach
  }

  /** Names the linked episode: from what the panel already loaded, else by paging the episode list. */
  static async resolveEpisode(id: string): Promise<void> {
    if (!id || id in store().episodes || this.lookingUp.has(id)) return
    const episodes = useEpisodesStore.getState()
    const known =
      episodes.details[id]?.data ??
      [...Object.values(episodes.pages), ...Object.values(usePickerStore.getState().results)]
        .flatMap((entry) => entry.data?.items ?? [])
        .find((e) => e.id === id)
    if (known) return store().addEpisodes([known])
    this.lookingUp.add(id)
    try {
      const found = await findEpisodes([id])
      store().addEpisodes(found, found.length ? [] : [id])
    } catch {
      // Shown as unknown; the id is kept as it is.
    } finally {
      this.lookingUp.delete(id)
    }
  }

  /** Checks the draft; the inline errors show what is wrong. */
  static check(key: string): boolean {
    const e = store().editors[key]
    if (!e) return false
    const parsed = campaignFormSchema.safeParse(campaignFormValues(e.draft))
    if (parsed.success) return true
    store().setEditor(key, { ...e, errors: fieldErrors(parsed.error) })
    ToastService.error(CAMPAIGNS.editor.fixErrors)
    return false
  }

  /**
   * Creates (`NEW_CAMPAIGN`) or updates the draft — only the fields that changed. The saved campaign (the
   * current one when nothing changed), or undefined: inline errors, or a toast.
   */
  static async save(key: string, quiet = false): Promise<AdminCampaign | undefined> {
    const e = store().editors[key]
    if (!e || store().saving[key] || !this.check(key)) return undefined
    const current = useCampaignsStore.getState().details[key]?.data
    if (key !== NEW_CAMPAIGN && e.base && !isEditorDirty(e) && current) return current
    store().setSaving(key, true)
    try {
      const saved =
        key === NEW_CAMPAIGN
          ? await createCampaign(campaignInput(e.draft))
          : await updateCampaign(key, campaignPatch(e.base ?? newCampaignDraft(), e.draft))
      if (!quiet)
        ToastService.success(key === NEW_CAMPAIGN ? CAMPAIGNS.editor.created : CAMPAIGNS.editor.saved)
      CampaignsController.stored(saved)
      const after = store().editors[key] ?? e
      const base = draftFromCampaign(saved)
      // Edits typed while it saved stay on screen.
      const draft = sameDraft(after.draft, e.draft) ? base : after.draft
      store().setEditor(saved.id, { ...after, base, draft, errors: {} })
      if (key === NEW_CAMPAIGN) store().setEditor(NEW_CAMPAIGN, undefined)
      return saved
    } catch (error) {
      const fields = errorCode(error).fields
      const latest = store().editors[key]
      if (latest && Object.keys(fields).length) store().setEditor(key, { ...latest, errors: fields })
      toastFailure(error)
      return undefined
    } finally {
      store().setSaving(key, false)
    }
  }

  /**
   * Before the send dialog: the draft valid, a message in the source language, a delivery that can be used.
   * Problems are shown inline.
   */
  static prepareSend(key: string): boolean {
    if (!this.check(key)) return false
    const e = store().editors[key]!
    const source = e.draft.sourceLanguage
    const errors: Record<string, string> = {}
    const message = e.draft.messages[source]
    if (!message.title.trim()) errors[`messages.${source}.title`] = CAMPAIGNS.errors.titleMissing
    if (!message.body.trim()) errors[`messages.${source}.body`] = CAMPAIGNS.errors.bodyMissing
    const problem = deliveryProblem(e.delivery, new Date())
    if (problem) errors.delivery = CAMPAIGNS.editor.delivery.problems[problem]
    if (Object.keys(errors).length === 0) return true
    store().setEditor(key, { ...e, errors: { ...e.errors, ...errors } })
    ToastService.error(
      problem && Object.keys(errors).length === 1
        ? CAMPAIGNS.editor.delivery.problems[problem]
        : CAMPAIGNS.editor.sendDialog.failures.no_source_message,
    )
    return false
  }

  /** Saves what changed, then queues the campaign. A failure is worded for the dialog (it stays open). */
  static async send(key: string): Promise<Outcome> {
    const e = store().editors[key]
    const words = CAMPAIGNS.editor.sendDialog
    if (!e) return { ok: false, message: words.failures.other }
    const delivery = deliveryInput(e.delivery)
    const problem = deliveryProblem(e.delivery, new Date())
    if (!delivery || problem)
      return { ok: false, message: problem ? CAMPAIGNS.editor.delivery.problems[problem] : words.noDelivery }
    const saved = await this.save(key, true)
    if (!saved) return { ok: false, message: CAMPAIGNS.editor.fixErrors }
    try {
      const campaign = await sendCampaign(saved.id, delivery)
      CampaignsController.stored(campaign)
      ToastService.success(
        delivery.mode === "now" ? words.sent : words.scheduled,
        deliverySummary(delivery, DELIVERY_WORDS),
      )
      return { ok: true, message: words.sent }
    } catch (error) {
      const { failure, text } = detailOf(error)
      const reason = sendFailure(failure.code, failure.message)
      if (reason === "not_draft") void CampaignsController.loadCampaign(saved.id, true)
      return {
        ok: false,
        message: reason === "other" ? `${words.failures.other} ${text}` : words.failures[reason],
      }
    }
  }

  /** Saves what changed, then pushes the campaign to one person now. Worded for the popover. */
  static async test(key: string, body: TestInput): Promise<Outcome> {
    const words = CAMPAIGNS.editor.test
    const saved = await this.save(key, true)
    if (!saved) return { ok: false, message: CAMPAIGNS.editor.fixErrors }
    try {
      const result = await testCampaign(saved.id, body)
      return { ok: true, message: result.onesignalId ? words.sent : words.sentNoId }
    } catch (error) {
      const { failure, text } = detailOf(error)
      const reason = testFailure(failure.code, failure.status, failure.message)
      const message =
        reason === "other" || reason === "onesignal_refused"
          ? `${words.failures[reason]} ${text}`
          : words.failures[reason]
      return { ok: false, message }
    }
  }

  static setDialog(dialog: EditorDialog | null): void {
    store().setDialog(dialog)
  }

  static reset(): void {
    store().clear()
  }
}
