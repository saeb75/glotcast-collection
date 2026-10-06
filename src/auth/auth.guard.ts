import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { type Request } from "express"
import { UsersService } from "../users/users.service"
import { type AuthClaims, AuthVerifier } from "./auth-verifier"

export type AuthedRequest = Request & { user?: AuthClaims }

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  const m = header ? /^Bearer\s+(.+)$/i.exec(header) : null
  return m ? m[1]!.trim() : null
}

/** A signed-in (or anonymous) Supabase user: the token is verified and the user provisioned on first sight. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly verifier: AuthVerifier,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const token = bearerToken(req)
    if (!token) throw new UnauthorizedException("sign in first")
    const claims = await this.verifier.verify(token)
    await this.users.provision(claims)
    req.user = claims
    return true
  }
}

/**
 * "public" routes: anyone may call them; with a token the caller's personal fields (isFollowing, progress…) are
 * filled in. A token that is sent must be valid (401 otherwise) so an expired session is noticed, not hidden.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly verifier: AuthVerifier,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const token = bearerToken(req)
    if (!token) return true
    const claims = await this.verifier.verify(token)
    await this.users.provision(claims)
    req.user = claims
    return true
  }
}

/** The current user's claims on a route guarded by AuthGuard. */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthClaims => {
  const user = context.switchToHttp().getRequest<AuthedRequest>().user
  if (!user) throw new UnauthorizedException("sign in first")
  return user
})

/** The caller's claims on a route guarded by OptionalAuthGuard; null without a token. */
export const OptionalUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthClaims | null =>
    context.switchToHttp().getRequest<AuthedRequest>().user ?? null,
)
