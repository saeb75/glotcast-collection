import { Controller, Get, Query } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { SearchDto, SearchQueryDto } from "../catalog/catalog.dto"
import { SearchService } from "./search.service"

@ApiTags("catalog")
@Controller({ path: "search", version: "1" })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** Podcasts (name, description) and episodes (title, description) containing `q`; at most 10 of each. */
  @Get()
  @ZodResponse({ type: SearchDto, status: 200 })
  find(@Query() query: SearchQueryDto) {
    return this.search.search(query.q)
  }
}
