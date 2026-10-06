import { randomUUID } from "node:crypto"
import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { DispatcherService } from "./dispatcher.service"
import { type Locale } from "./locales"
import { OneSignalClient, OneSignalRejected } from "./onesignal.client"
import { payloadHash, type PushData } from "./payload"
import { ts } from "./sql"

export interface TestPush {
  userId: string
  language: Locale
  title: string
  body: string
  data: PushData
  imageUrl: string | null
  variant?: string | null
}

/**
 * A push to one user right now, outside the caps and the scheduler (the admin's "Test send", `notify test`).
 * Logged as a `test` row; 409 `no_subscription` when OneSignal has no subscription for the user.
 */
@Injectable()
export class TestSendService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly onesignal: OneSignalClient,
    private readonly dispatcher: DispatcherService,
  ) {}

  async send(push: TestPush, now = new Date()): Promise<{ onesignalId: string | null }> {
    if (!this.onesignal.configured)
      throw new ServiceUnavailableException("push notifications are not configured")
    const batchId = randomUUID()
    await this.db.transaction(async (tx) => {
      const user = await tx.execute<{ local_date: string }>(sql`
        SELECT (${ts(now)} AT TIME ZONE coalesce(timezone, 'UTC'))::date::text AS local_date
        FROM app.users WHERE id = ${push.userId}
      `)
      const localDate = user.rows[0]?.local_date
      if (!localDate) throw new NotFoundException("no such user")
      await tx.execute(sql`
        INSERT INTO app.notification_batches (id, kind, language, recipients, status, created_at)
        VALUES (${batchId}, 'test', ${push.language}, 1, 'pending', ${ts(now)})
      `)
      await tx.execute(sql`
        INSERT INTO app.notification_sends (user_id, kind, grp, daily_slot, batch_id, local_date, due_at, status,
          language, variant, title, body, data, image_url, payload_hash, created_at)
        VALUES (${push.userId}, 'test', 'test', false, ${batchId}, ${localDate}, ${ts(now)}, 'sending',
          ${push.language}, ${push.variant ?? null}, ${push.title}, ${push.body}, ${JSON.stringify(push.data)}::jsonb,
          ${push.imageUrl}, ${payloadHash(push)}, ${ts(now)})
      `)
    })
    try {
      const result = await this.onesignal.send({
        externalIds: [push.userId],
        title: push.title,
        body: push.body,
        data: push.data,
        imageUrl: push.imageUrl,
        group: "test",
        idempotencyKey: batchId,
        name: `test · ${push.language}`,
      })
      if (result.notSubscribed || result.invalidExternalIds.includes(push.userId)) {
        await this.dispatcher.record(batchId, "empty", result.id, [push.userId], now)
        throw new ConflictException("no_subscription")
      }
      await this.dispatcher.record(batchId, "sent", result.id, [], now)
      return { onesignalId: result.id }
    } catch (err) {
      if (err instanceof ConflictException) throw err
      await this.dispatcher.fail(batchId, String(err), now)
      if (err instanceof OneSignalRejected)
        throw new BadGatewayException(`OneSignal refused the push: ${err.message}`)
      throw new ServiceUnavailableException("OneSignal did not answer, try again")
    }
  }
}
