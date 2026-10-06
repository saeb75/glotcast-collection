import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { from, mergeMap, type Observable } from "rxjs"
import { type AuthedRequest } from "../../auth/auth.guard"
import { AUDIT, type AuditSpec } from "./audit.decorator"
import { AdminAuditRepository } from "./audit.repository"

const pick = (source: Record<string, unknown>, keys: string[] = []): [string, unknown][] =>
  keys.flatMap((key): [string, unknown][] => (source[key] === undefined ? [] : [[key, source[key]]]))

/**
 * Writes the audit entry of an `@Audit` endpoint once it answered successfully (failed requests are not
 * recorded). The write is awaited so the log is complete, but a failed write never fails the request.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AdminAuditRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const spec = this.reflector.get<AuditSpec | undefined>(AUDIT, context.getHandler())
    if (!spec) return next.handle()
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    return next.handle().pipe(mergeMap((body: unknown) => from(this.write(spec, req, body).then(() => body))))
  }

  private async write(spec: AuditSpec, req: AuthedRequest, response: unknown): Promise<void> {
    const query = (req.query ?? {}) as Record<string, unknown>
    const params = (req.params ?? {}) as Record<string, string | undefined>
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>
    if (spec.onlyWith && !query[spec.onlyWith]) return
    const meta: Record<string, unknown> = Object.fromEntries([
      ...pick(query, spec.query),
      ...pick(params, spec.params),
      ...pick(body, spec.body),
    ])
    const fromResponse =
      spec.target?.response && response && typeof response === "object"
        ? (response as Record<string, unknown>)[spec.target.response]
        : undefined
    const id = spec.target?.param ? params[spec.target.param] : fromResponse
    await this.audit
      .record({
        actorId: req.user?.userId ?? null,
        actorEmail: req.user?.email ?? null,
        action: spec.action,
        targetType: spec.target?.type ?? null,
        targetId: typeof id === "string" ? id : null,
        meta,
      })
      .catch((err: unknown) => this.logger.warn(`audit entry not written (${spec.action}): ${String(err)}`))
  }
}
