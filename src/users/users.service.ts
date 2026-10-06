import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common"
import { eq, sql } from "drizzle-orm"
import { type AuthClaims, AuthVerifier } from "../auth/auth-verifier"
import { DRIZZLE, type Database } from "../database/database.module"
import { users } from "../database/schema/app"
import { LegacyImportService } from "./legacy-import.service"
import { SupabaseAdmin } from "./supabase-admin"

const SEEN_EVERY_MS = 60 * 60_000

export interface ClaimResult {
  moved: { progress: number; words: number; follows: number; favorites: number }
}

/**
 * Our side of a Supabase user: provisioned on the first authenticated request (and, for a registered account,
 * its legacy Strapi data copied once), deleted with the account, and able to absorb the guest account a user
 * made before signing in.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  /** user id + claims → last time the row was written (skip the upsert on every request). */
  private readonly seen = new Map<string, number>()
  /** Deleted in this process: a still-valid token must not bring the user back. */
  private readonly deleted = new Set<string>()

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly verifier: AuthVerifier,
    private readonly admin: SupabaseAdmin,
    private readonly legacy: LegacyImportService,
  ) {}

  async provision(claims: AuthClaims): Promise<void> {
    if (this.deleted.has(claims.userId)) throw new ForbiddenException("this account was deleted")
    const key = `${claims.userId}|${claims.isAnonymous}|${claims.email ?? ""}`
    const last = this.seen.get(key)
    if (last && Date.now() - last < SEEN_EVERY_MS) return
    const res = await this.db.execute<{ legacy_checked_at: Date | null }>(sql`
      INSERT INTO app.users (id, is_anonymous, email, name, avatar_url)
      VALUES (${claims.userId}, ${claims.isAnonymous}, ${claims.email}, ${claims.name}, ${claims.avatarUrl})
      ON CONFLICT (id) DO UPDATE SET
        is_anonymous = excluded.is_anonymous,
        email = coalesce(excluded.email, app.users.email),
        name = coalesce(app.users.name, excluded.name),
        avatar_url = coalesce(app.users.avatar_url, excluded.avatar_url),
        last_seen_at = now()
      RETURNING legacy_checked_at
    `)
    // A registered account (new, or a guest that just linked an identity): its legacy data, once.
    if (!claims.isAnonymous && claims.email && res.rows[0]?.legacy_checked_at === null) {
      await this.importLegacy(claims.userId, claims.email)
    }
    this.seen.set(key, Date.now())
  }

  /** The legacy import never fails the request that triggered it: it is retried on the next provisioning. */
  private async importLegacy(userId: string, email: string): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        await this.legacy.importFor(tx, userId, email)
        await tx.execute(
          sql`UPDATE app.users SET legacy_checked_at = coalesce(legacy_checked_at, now()) WHERE id = ${userId}`,
        )
      })
    } catch (err) {
      this.logger.warn({ err, userId }, "legacy import failed; retried on the next sign-in")
    }
  }

  /** The account and everything it keeps. Supabase first: if that fails, nothing is lost here. */
  async delete(userId: string): Promise<void> {
    await this.admin.deleteUser(userId)
    await this.db.delete(users).where(eq(users.id, userId))
    this.deleted.add(userId)
    this.forget(userId)
  }

  private forget(userId: string): void {
    for (const key of this.seen.keys()) if (key.startsWith(`${userId}|`)) this.seen.delete(key)
  }

  /**
   * A registered user signed in from a guest session: the guest's progress, listening days, words, follows and
   * favorites move to this account (the account's own rows win on conflict; listening seconds of the same day add
   * up), its onboarding answers fill what the account never set, and the guest is deleted. The guest's token
   * proves the caller owned it. Also claims the account's legacy Strapi data if that never happened.
   */
  async claimGuest(claims: AuthClaims, guestToken: string): Promise<ClaimResult> {
    if (claims.isAnonymous) throw new ForbiddenException("sign in to an account before claiming a guest")
    const guest = await this.verifier.verify(guestToken)
    if (!guest.isAnonymous) throw new ForbiddenException("only a guest account can be claimed")
    const moved = { progress: 0, words: 0, follows: 0, favorites: 0 }
    if (guest.userId !== claims.userId) {
      const to = claims.userId
      const from = guest.userId
      await this.db.transaction(async (tx) => {
        const exists = await tx.execute(sql`SELECT 1 FROM app.users WHERE id = ${from} FOR UPDATE`)
        if (!exists.rows.length) return
        const progress = await tx.execute(sql`
          INSERT INTO app.listening_progress (user_id, episode_id, level, position_sec, duration_sec, completed_at, updated_at)
          SELECT ${to}::uuid, episode_id, level, position_sec, duration_sec, completed_at, updated_at
          FROM app.listening_progress WHERE user_id = ${from}
          ON CONFLICT DO NOTHING
        `)
        await tx.execute(sql`
          INSERT INTO app.listening_days (user_id, date, seconds)
          SELECT ${to}::uuid, date, seconds FROM app.listening_days WHERE user_id = ${from}
          ON CONFLICT (user_id, date) DO UPDATE SET seconds = app.listening_days.seconds + excluded.seconds
        `)
        const claimedWords = await tx.execute(sql`
          INSERT INTO app.words (user_id, word, meaning, phonetic, audio_url, detail, language, source, box,
                                 next_review_at, last_reviewed_at, correct_count, incorrect_count, created_at, updated_at)
          SELECT ${to}::uuid, word, meaning, phonetic, audio_url, detail, language, source, box,
                 next_review_at, last_reviewed_at, correct_count, incorrect_count, created_at, updated_at
          FROM app.words WHERE user_id = ${from}
          ON CONFLICT DO NOTHING
        `)
        const follows = await tx.execute(sql`
          INSERT INTO app.follows (user_id, podcast_id, created_at)
          SELECT ${to}::uuid, podcast_id, created_at FROM app.follows WHERE user_id = ${from}
          ON CONFLICT DO NOTHING
        `)
        const favorites = await tx.execute(sql`
          INSERT INTO app.favorites (user_id, episode_id, created_at)
          SELECT ${to}::uuid, episode_id, created_at FROM app.favorites WHERE user_id = ${from}
          ON CONFLICT DO NOTHING
        `)
        // Onboarding answered as a guest: an account that never set its profile takes the guest's; otherwise
        // only what the account left empty is filled.
        const fresh = sql`(u.profile_set_at IS NULL AND g.profile_set_at IS NOT NULL)`
        const take = (column: string) =>
          sql`${sql.raw(column)} = CASE WHEN ${fresh} THEN ${sql.raw(`g.${column}`)}
              ELSE coalesce(${sql.raw(`u.${column}`)}, ${sql.raw(`g.${column}`)}) END`
        await tx.execute(sql`
          UPDATE app.users u SET
            ${take("native_language")}, ${take("ui_language")}, ${take("translation_language")},
            ${take("motivation")}, ${take("reminder_time")},
            level = CASE WHEN ${fresh} THEN g.level ELSE u.level END,
            daily_goal_min = CASE WHEN ${fresh} THEN g.daily_goal_min ELSE u.daily_goal_min END,
            interests = CASE WHEN ${fresh} OR cardinality(u.interests) = 0 THEN g.interests ELSE u.interests END,
            profile_set_at = coalesce(u.profile_set_at, g.profile_set_at),
            feature_access = u.feature_access OR g.feature_access,
            updated_at = now()
          FROM app.users g
          WHERE u.id = ${to} AND g.id = ${from}
        `)
        await tx.delete(users).where(eq(users.id, from)) // the rest of its rows go with it
        moved.progress = progress.rowCount ?? 0
        moved.words = claimedWords.rowCount ?? 0
        moved.follows = follows.rowCount ?? 0
        moved.favorites = favorites.rowCount ?? 0
      })
      // The guest's auth user is no longer needed; failing to remove it is not the user's problem.
      if (this.admin.configured)
        await this.admin.deleteUser(from).catch((err: unknown) => this.logger.warn({ err }, "guest cleanup"))
      this.deleted.add(from)
      this.forget(from)
    }
    if (claims.email) {
      await this.db.transaction(async (tx) => {
        await this.legacy.importFor(tx, claims.userId, claims.email!)
      })
    }
    return { moved }
  }
}
