import { Body, Controller, Header, HttpCode, Post, UseGuards, UseInterceptors } from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { R2Storage } from "../../storage/r2.service"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { PresignDto, PresignedDto } from "./media.dto"

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/media", version: "1" })
export class AdminMediaController {
  constructor(private readonly storage: R2Storage) {}

  /** A presigned R2 PUT (15 minutes): the panel uploads the file directly; the API never sees the bytes. */
  @Post("presign")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @Audit({ action: "media.presign", body: ["folder", "filename", "contentType"] })
  @ZodResponse({ type: PresignedDto, status: 200 })
  presign(@Body() body: PresignDto) {
    return this.storage.presignPut(body.folder, body.filename, body.contentType)
  }
}
