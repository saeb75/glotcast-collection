import { Module } from "@nestjs/common"
import { MigrateStrapiService } from "./migrate-strapi.service"

/** CLI only: `migrate-strapi`. */
@Module({ providers: [MigrateStrapiService], exports: [MigrateStrapiService] })
export class StrapiModule {}
