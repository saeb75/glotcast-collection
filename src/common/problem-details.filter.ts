import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common"
import { type Request, type Response } from "express"
import { ZodSerializationException, ZodValidationException } from "nestjs-zod"
import { ZodError } from "zod"

/** HttpStatus.NOT_FOUND → "Not Found" (the HTTP reason phrase). */
export const reasonPhrase = (status: number): string | undefined =>
  HttpStatus[status]
    ?.split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ")

/** RFC 9457 problem details for every error; internal errors are logged, never leaked. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let title = "Internal Server Error"
    let detail: string | undefined
    let errors: unknown

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST
      title = "Validation failed"
      const zodError = exception.getZodError()
      errors = zodError instanceof ZodError ? zodError.issues : undefined
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse()
      title = reasonPhrase(status) ?? exception.name
      detail =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message?.toString() ?? undefined)
      if (exception instanceof ZodSerializationException) {
        this.logger.error({ err: exception.getZodError() }, "response failed its own schema")
      }
    } else {
      this.logger.error({ err: exception }, "unhandled error")
    }

    const retryAfter = (exception as { retryAfter?: number } | null)?.retryAfter
    if (retryAfter) res.setHeader("Retry-After", String(retryAfter))
    res
      .status(status)
      .type("application/problem+json")
      .json({
        type: "about:blank",
        title,
        status,
        ...(detail && detail !== title ? { detail } : {}),
        instance: req.originalUrl,
        ...(errors ? { errors } : {}),
        ...(retryAfter ? { retryAfter } : {}),
      })
  }
}
