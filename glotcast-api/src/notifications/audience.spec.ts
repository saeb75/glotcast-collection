import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import { audienceSchema, audienceWhere } from "./audience"

const dialect = new PgDialect()
const now = new Date("2026-10-07T12:00:00Z")
const render = (a: Parameters<typeof audienceWhere>[0]) => dialect.sqlToQuery(audienceWhere(a, now))
const squash = (s: string) => s.replace(/\s+/g, " ").trim()

describe("audience", () => {
  it("matches everyone without filters", () => {
    expect(render({ segment: "all" }).sql).toBe("true")
  })

  it("turns segments into conditions (pro = backend Pro or an active subscription)", () => {
    expect(render({ segment: "pro" }).sql).toBe("(u.feature_access OR u.pro_active)")
    expect(render({ segment: "free" }).sql).toBe("NOT (u.feature_access OR u.pro_active)")
    expect(render({ segment: "guests" }).sql).toBe("u.is_anonymous")
    expect(render({ segment: "signedIn" }).sql).toBe("NOT u.is_anonymous")
  })

  it("ANDs levels, app languages, activity and follows, with every value a parameter", () => {
    const q = render({
      segment: "signedIn",
      levels: ["bg", "in"],
      languages: ["tr", "pt"],
      inactiveDays: 14,
      activeWithinDays: 60,
      podcastIds: ["0b8f5a8e-2d55-4a63-a0f5-3a3d0c0e7d11"],
    })
    const text = squash(q.sql)
    expect(text).toContain("NOT u.is_anonymous AND u.level = ANY($1::app.level[])")
    expect(text).toContain("= ANY($3::text[])")
    expect(text).toContain("u.last_seen_at <= $4::timestamptz - $5::interval")
    expect(text).toContain("u.last_seen_at > $6::timestamptz - $7::interval")
    expect(text).toContain("f.podcast_id = ANY($8::uuid[])")
    expect(q.params).toEqual([
      "{bg,in}",
      "{ar,de,en,es,fr,hi,id,it,ja,ko,pl,pt,ru,tr,vi,zh}",
      "{tr,pt}",
      now.toISOString(),
      "14 days",
      now.toISOString(),
      "60 days",
      "{0b8f5a8e-2d55-4a63-a0f5-3a3d0c0e7d11}",
    ])
  })

  it("validates the shape", () => {
    expect(audienceSchema.safeParse({ segment: "all", languages: ["xx"] }).success).toBe(false)
    expect(audienceSchema.safeParse({ segment: "everyone" }).success).toBe(false)
    expect(audienceSchema.safeParse({ segment: "pro", levels: ["ad"] }).success).toBe(true)
  })
})
