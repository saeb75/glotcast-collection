import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../database/database.module"
import { type AutomationSettings, withDefaults } from "./settings"
import { type Executor } from "./sql"

/** The automations' settings row (app.notification_settings, id = 1). */
@Injectable()
export class NotificationSettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async get(db: Executor = this.db): Promise<AutomationSettings> {
    const res = await db.execute<{ automations: unknown }>(
      sql`SELECT automations FROM app.notification_settings WHERE id = 1`,
    )
    return withDefaults(res.rows[0]?.automations)
  }

  async put(settings: AutomationSettings, updatedBy: string | null): Promise<AutomationSettings> {
    await this.db.execute(sql`
      INSERT INTO app.notification_settings (id, automations, updated_at, updated_by)
      VALUES (1, ${JSON.stringify(settings)}::jsonb, now(), ${updatedBy})
      ON CONFLICT (id) DO UPDATE SET automations = excluded.automations, updated_at = now(),
        updated_by = excluded.updated_by
    `)
    return this.get()
  }
}
