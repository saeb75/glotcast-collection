import { type Session } from "@supabase/supabase-js"
import { setUnauthorizedHandler } from "@/api/client"
import { getMe } from "@/api/dashboard"
import { errorCode } from "@/api/errors"
import { AuthError, SupabaseService } from "@/services/SupabaseService"
import { useAuthStore } from "@/stores/useAuthStore"
import { useLoginStore } from "@/stores/useLoginStore"
import { AuditController } from "./AuditController"
import { CategoriesController } from "./CategoriesController"
import { CoverController } from "./CoverController"
import { DashboardController } from "./DashboardController"
import { EpisodesController } from "./EpisodesController"
import { HomeConfigController } from "./HomeConfigController"
import { LevelEditorController } from "./LevelEditorController"
import { ListsController } from "./ListsController"
import { PickerController } from "./PickerController"
import { PodcastsController } from "./PodcastsController"
import { UsersController } from "./UsersController"

const store = useAuthStore.getState
const login = useLoginStore.getState

export class AuthController {
  private static started = false
  private static recovering: Promise<void> | null = null

  /** Reads the stored session behind the splash, then follows sign-ins, sign-outs and refreshes. */
  static init(): void {
    if (this.started) return
    this.started = true
    setUnauthorizedHandler(() => void this.recover())
    if (!SupabaseService.configured) {
      store().setReady(true)
      return
    }
    void SupabaseService.session()
      .then((session) => this.apply(session))
      .finally(() => store().setReady(true))
    SupabaseService.onSessionChange((session) => this.apply(session))
  }

  /** Asks the API whether this account is an admin (the panel's gate: GET /v1/admin/me). */
  static async checkAccess(): Promise<void> {
    if (store().access === "checking") return
    store().setAccess("checking")
    try {
      await getMe()
      store().setAccess("granted")
    } catch (error) {
      const failure = errorCode(error)
      if (failure.code === "unauthorized") return // recover() signs out or retries
      if (failure.code !== "forbidden") return store().setAccess("failed", failure.message)
      // A role granted after sign-in only reaches the API with a fresh token: refresh once, ask again.
      const refreshed = await SupabaseService.refresh().catch(() => false)
      if (
        refreshed &&
        (await getMe().then(
          () => true,
          () => false,
        ))
      )
        return store().setAccess("granted")
      store().setAccess("forbidden")
    }
  }

  static async sendCode(email: string): Promise<void> {
    const address = email.trim().toLowerCase()
    login().setBusy(true)
    login().setError(undefined)
    try {
      await SupabaseService.sendCode(address)
      login().setEmail(address)
      login().setStep("code")
    } catch (error) {
      login().setError(error instanceof AuthError ? error.code : "unknown")
    } finally {
      login().setBusy(false)
    }
  }

  static async verifyCode(code: string): Promise<void> {
    login().setBusy(true)
    login().setError(undefined)
    try {
      await SupabaseService.verifyCode(login().email, code.trim())
      login().reset()
    } catch (error) {
      login().setError(error instanceof AuthError ? error.code : "unknown")
    } finally {
      login().setBusy(false)
    }
  }

  static changeEmail(): void {
    login().setStep("email")
    login().setError(undefined)
  }

  static async signOut(): Promise<void> {
    await SupabaseService.signOut().catch(() => undefined)
    this.apply(null)
  }

  /** A 401: the token may just be stale — refresh once, else the session is over. */
  private static recover(): Promise<void> {
    this.recovering ??= (async () => {
      const refreshed = await SupabaseService.refresh().catch(() => false)
      if (!refreshed) await this.signOut()
      else if (store().access === "checking" || store().access === "unknown") store().setAccess("unknown")
    })().finally(() => {
      this.recovering = null
    })
    return this.recovering
  }

  private static apply(session: Session | null): void {
    const user = session ? { id: session.user.id, email: session.user.email ?? null } : null
    if (store().user?.id === user?.id) return
    store().setUser(user)
    store().setAccess("unknown")
    // Another account (or none): nothing loaded for the previous one may stay on screen.
    for (const controller of [
      DashboardController,
      PodcastsController,
      EpisodesController,
      LevelEditorController,
      CoverController,
      CategoriesController,
      ListsController,
      HomeConfigController,
      UsersController,
      AuditController,
      PickerController,
    ])
      controller.reset()
  }
}
