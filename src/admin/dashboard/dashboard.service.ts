import { Inject, Injectable } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { CatalogRepository } from "../../catalog/catalog.repository"
import { DRIZZLE, type Database } from "../../database/database.module"
import { type Dashboard } from "./dashboard.dto"

const DAU_DAYS = 30

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly catalog: CatalogRepository,
  ) {}

  async dashboard(): Promise<Dashboard> {
    const [users, dau, episodes, top] = await Promise.all([
      this.db.execute<{ total: number; anonymous: number; last7: number }>(sql`
        SELECT count(*)::int AS total, count(*) FILTER (WHERE is_anonymous)::int AS anonymous,
               count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7
        FROM app.users
      `),
      this.db.execute<{ date: string; count: number }>(sql`
        SELECT d.day::date::text AS date, count(DISTINCT ld.user_id)::int AS count
        FROM generate_series((now() AT TIME ZONE 'UTC')::date - ${DAU_DAYS - 1}::int, (now() AT TIME ZONE 'UTC')::date,
                             interval '1 day') AS d(day)
        LEFT JOIN app.listening_days ld ON ld.date = d.day::date AND ld.seconds > 0
        GROUP BY d.day ORDER BY d.day
      `),
      this.db.execute<{ published: number; drafts: number }>(sql`
        SELECT count(*) FILTER (WHERE published_at IS NOT NULL AND published_at <= now())::int AS published,
               count(*) FILTER (WHERE published_at IS NULL OR published_at > now())::int AS drafts
        FROM app.episodes
      `),
      this.db.execute<{ episode_id: string; listeners: number }>(sql`
        SELECT episode_id, count(DISTINCT user_id)::int AS listeners FROM app.listening_progress
        WHERE updated_at > now() - interval '30 days'
        GROUP BY episode_id ORDER BY listeners DESC, episode_id LIMIT 20
      `),
    ])
    const listeners = new Map(top.rows.map((r) => [r.episode_id, r.listeners]))
    const summaries = await this.catalog.episodesByIds(top.rows.map((r) => r.episode_id))
    const u = users.rows[0]
    const e = episodes.rows[0]
    return {
      users: { total: u?.total ?? 0, anonymous: u?.anonymous ?? 0, last7Days: u?.last7 ?? 0 },
      dau: dau.rows,
      episodes: { published: e?.published ?? 0, drafts: e?.drafts ?? 0 },
      topEpisodes: summaries
        .slice(0, 10)
        .map((episode) => ({ episode, listeners: listeners.get(episode.id) ?? 0 })),
    }
  }
}
