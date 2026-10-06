import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { AuthVerifier } from "../auth/auth-verifier"
import { type AuthedRequest, bearerToken } from "../auth/auth.guard"

/**
 * A signed-in admin: a verified token of a registered account whose `app_metadata.role` is `admin`
 * (`node dist/cli.js admin grant <email>`). Unlike AuthGuard it never provisions an app user.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly verifier: AuthVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const token = bearerToken(req)
    if (!token) throw new UnauthorizedException("sign in first")
    const claims = await this.verifier.verify(token)
    if (claims.isAnonymous || !claims.isAdmin) throw new ForbiddenException("admins only")
    req.user = claims
    return true
  }
}
