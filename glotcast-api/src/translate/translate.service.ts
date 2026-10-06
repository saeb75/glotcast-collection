import { Injectable, NotFoundException } from "@nestjs/common"
import { CatalogRepository } from "../catalog/catalog.repository"
import { type Level } from "../database/schema/app"
import { EpisodesRepository } from "../episodes/episodes.repository"
import { GoogleTranslateClient } from "./google-translate.client"
import { googleTarget, isEnglish } from "./targets"
import { TranslateRepository } from "./translate.repository"

@Injectable()
export class TranslateService {
  /** One upstream call per transcript at a time: a second request waits for the first. */
  private readonly inflight = new Map<string, Promise<string[]>>()

  constructor(
    private readonly catalog: CatalogRepository,
    private readonly episodes: EpisodesRepository,
    private readonly repo: TranslateRepository,
    private readonly google: GoogleTranslateClient,
  ) {}

  /** A level's transcript translated chunk by chunk; translated once per (episode, level, target), then cached. */
  async transcript(ref: string, level: Level, target: string): Promise<{ target: string; chunks: string[] }> {
    const id = await this.catalog.episodeIdOf(ref)
    const stored = id ? await this.episodes.transcript(id, level) : null
    if (!id || !stored) throw new NotFoundException(`episode ${ref} has no ${level} level`)
    const texts = (stored.chunks ?? []).map((c) => c.text)
    if (!texts.length || isEnglish(target)) return { target, chunks: texts }
    const key = googleTarget(target)
    const cached = await this.repo.cached(id, level, key)
    if (cached && cached.length === texts.length) return { target, chunks: cached }
    const flight = `${id}|${level}|${key}`
    let pending = this.inflight.get(flight)
    if (!pending) {
      pending = this.google
        .translate(texts, key)
        .then(async (chunks) => {
          await this.repo.store(id, level, key, chunks)
          return chunks
        })
        .finally(() => this.inflight.delete(flight))
      this.inflight.set(flight, pending)
    }
    return { target, chunks: await pending }
  }

  async texts(texts: string[], target: string): Promise<{ target: string; texts: string[] }> {
    if (isEnglish(target)) return { target, texts }
    return { target, texts: await this.google.translate(texts, googleTarget(target)) }
  }
}
