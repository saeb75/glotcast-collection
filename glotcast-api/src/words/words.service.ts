import { Injectable, NotFoundException } from "@nestjs/common"
import { type PageQuery, offsetOf, toPage } from "../common/pagination"
import { DictionaryClient } from "./dictionary.client"
import { review } from "./leitner"
import { type NewWord, WordsRepository } from "./words.repository"

const REVIEW_BATCH = 100

@Injectable()
export class WordsService {
  constructor(
    private readonly words: WordsRepository,
    private readonly dictionary: DictionaryClient,
  ) {}

  lookup(word: string, target: string) {
    return this.dictionary.lookup(word, target)
  }

  async page(userId: string, q: PageQuery & { box?: number; q?: string }) {
    const { items, total } = await this.words.page(userId, {
      box: q.box,
      q: q.q,
      limit: q.pageSize,
      offset: offsetOf(q),
    })
    return toPage(items, total, q)
  }

  stats(userId: string) {
    return this.words.stats(userId)
  }

  save(userId: string, word: NewWord) {
    return this.words.upsert(userId, word)
  }

  remove(userId: string, id: string) {
    return this.words.delete(userId, id)
  }

  due(userId: string) {
    return this.words.due(userId, REVIEW_BATCH)
  }

  async review(userId: string, id: string, known: boolean) {
    const word = await this.words.get(userId, id)
    if (!word) throw new NotFoundException(`word ${id} not found`)
    const saved = await this.words.saveReview(userId, id, review(word, known))
    if (!saved) throw new NotFoundException(`word ${id} not found`)
    return saved
  }
}
