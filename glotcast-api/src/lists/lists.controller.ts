import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { OptionalAuthGuard } from "../auth/auth.guard"
import { ListPageDto, PageQueryDto } from "../catalog/catalog.dto"
import { ListsService } from "./lists.service"

@ApiTags("catalog")
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard)
@Controller({ path: "lists", version: "1" })
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  /** An editorial list and its episodes, in the list's order. */
  @Get(":slug")
  @ZodResponse({ type: ListPageDto, status: 200 })
  page(@Param("slug") slug: string, @Query() query: PageQueryDto) {
    return this.lists.page(slug, query)
  }
}
