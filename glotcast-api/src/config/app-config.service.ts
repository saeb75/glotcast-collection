import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { type Env } from "./env.schema"

/** Typed accessor over the validated env — inject this instead of reading process.env. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    const value = this.config.get(key, { infer: true })
    // A key the validator dropped because it was "" falls back to process.env's "": unset, like in validateEnv.
    return (value === "" ? undefined : value) as Env[K]
  }
}
