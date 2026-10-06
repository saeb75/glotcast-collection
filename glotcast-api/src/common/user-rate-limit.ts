import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { type AuthedRequest } from "../auth/auth.guard"

const USER_RATE_LIMIT = "user-rate-limit"

export interface UserRateLimitSpec {
  /** Requests allowed per window, per user. */
  limit: number
  windowMs: number
}

/** Per-user limit on a route that spends money upstream (translation, dictionary lookups). */
export const UserRateLimit = (spec: UserRateLimitSpec) => SetMetadata(USER_RATE_LIMIT, spec)

export class TooManyRequestsException extends HttpException {
  constructor(readonly retryAfter: number) {
    super("too many requests, slow down", HttpStatus.TOO_MANY_REQUESTS)
  }
}

/**
 * Fixed-window counter per user and route, in process memory (like the global IP throttler). Runs after AuthGuard
 * (`@UseGuards(AuthGuard, UserRateLimitGuard)`), so the key is the verified user id, not the IP: mobile users share
 * carrier NAT addresses.
 */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { start: number; count: number }>()

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const spec = this.reflector.getAllAndOverride<UserRateLimitSpec | undefined>(USER_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ])
    const user = context.switchToHttp().getRequest<AuthedRequest>().user
    if (!spec || !user) return true
    const key = `${context.getClass().name}.${context.getHandler().name}:${user.userId}`
    const now = Date.now()
    const window = this.windows.get(key)
    if (!window || now - window.start >= spec.windowMs) {
      this.windows.set(key, { start: now, count: 1 })
      if (this.windows.size > 50_000) this.sweep(now, spec.windowMs)
      return true
    }
    window.count += 1
    if (window.count > spec.limit) {
      throw new TooManyRequestsException(Math.ceil((window.start + spec.windowMs - now) / 1000))
    }
    return true
  }

  private sweep(now: number, windowMs: number): void {
    for (const [key, w] of this.windows) if (now - w.start >= windowMs) this.windows.delete(key)
  }
}
