import { Injectable, NotFoundException } from "@nestjs/common"
import { type PageQuery, offsetOf, toPage } from "../common/pagination"
import { ListsRepository } from "./lists.repository"

@Injectable()
export class ListsService {
  constructor(private readonly lists: ListsRepository) {}

  async page(slug: string, q: PageQuery) {
    const list = await this.lists.bySlug(slug)
    if (!list) throw new NotFoundException(`list ${slug} not found`)
    const [items, total] = await Promise.all([
      this.lists.episodes(list.id, q.pageSize, offsetOf(q)),
      this.lists.count(list.id),
    ])
    return { list, episodes: toPage(items, total, q) }
  }
}
