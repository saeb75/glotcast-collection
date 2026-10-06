import { Global, Module } from "@nestjs/common"
import { CatalogRepository } from "./catalog.repository"

/** The shared read side of the catalog (EpisodeSummary / PodcastSummary queries), available everywhere. */
@Global()
@Module({ providers: [CatalogRepository], exports: [CatalogRepository] })
export class CatalogModule {}
