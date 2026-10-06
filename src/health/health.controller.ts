import { Controller, Get, HttpCode, HttpStatus, Inject, Res } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import { type Response } from "express"
import { createZodDto, ZodResponse } from "nestjs-zod"
import { Pool } from "pg"
import { z } from "zod"
import { PG_POOL } from "../database/database.module"

class LiveDto extends createZodDto(z.object({ ok: z.literal(true) })) {}
class ReadyDto extends createZodDto(
  z.object({ ok: z.boolean(), checks: z.object({ database: z.enum(["up", "down"]) }) }),
) {}

@ApiTags("health")
@SkipThrottle()
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Process is up — no dependencies (liveness probe, the Docker healthcheck). */
  @Get("live")
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: LiveDto, status: 200 })
  live() {
    return { ok: true as const }
  }

  /** The database answers (readiness probe). */
  @Get("ready")
  @ZodResponse({ type: ReadyDto, status: 200 })
  async ready(@Res({ passthrough: true }) res: Response) {
    const database = await this.pool
      .query("SELECT 1")
      .then(() => "up" as const)
      .catch(() => "down" as const)
    const ok = database === "up"
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
    return { ok, checks: { database } }
  }
}
