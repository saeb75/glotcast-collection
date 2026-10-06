import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common"
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"
import { type AuthClaims } from "../../auth/auth-verifier"
import { CurrentUser } from "../../auth/auth.guard"
import { AdminGuard } from "../admin.guard"
import { Audit } from "../audit/audit.decorator"
import { AdminAuditInterceptor } from "../audit/audit.interceptor"
import { TranscribeDto, TranscribeJobDto, TranscriptionDto } from "./transcribe.dto"
import { AdminTranscribeService } from "./transcribe.service"

const uuid = new ParseUUIDPipe()

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(AdminGuard)
@UseInterceptors(AdminAuditInterceptor)
@Controller({ path: "admin/transcribe", version: "1" })
export class AdminTranscribeController {
  constructor(private readonly transcribe: AdminTranscribeService) {}

  /** Starts an AssemblyAI transcription (Universal-2, speaker labels) of an uploaded audio file. */
  @Post()
  @Audit({
    action: "transcribe.submit",
    target: { type: "transcription", response: "jobId" },
    body: ["audioUrl"],
  })
  @ZodResponse({ type: TranscribeJobDto, status: 201 })
  submit(@CurrentUser() admin: AuthClaims, @Body() body: TranscribeDto) {
    return this.transcribe.submit(body.audioUrl, admin.userId)
  }

  /** Poll until `completed` (or `error`): then utterances, sentences and paragraphs, each with word timings. */
  @Get(":jobId")
  @Header("Cache-Control", "private, no-store")
  @ZodResponse({ type: TranscriptionDto, status: 200 })
  get(@Param("jobId", uuid) jobId: string) {
    return this.transcribe.get(jobId)
  }
}
