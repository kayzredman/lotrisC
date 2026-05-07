import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { getEnv } from '@lotris/config';
import type { AuthService } from './auth.service';

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      auth: unknown;
    }>();

    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, { secretKey: getEnv().CLERK_SECRET_KEY });

      if (!payload.org_id) {
        // Dev/demo fallback: no Clerk org — resolve by clerkUserId only (mirrors tRPC context)
        const session = await this.authService.resolveSessionByClerkId(payload.sub);
        request.auth = session;
        return true;
      }

      // Resolve to internal scoped session { tenantId, userId, role }
      const session = await this.authService.resolveSession({
        clerkUserId: payload.sub,
        clerkOrgId: payload.org_id,
      });

      request.auth = session;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid Clerk JWT');
    }
  }
}
