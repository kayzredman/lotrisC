import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { getEnv } from '@lotris/config';
import { AuthService } from './auth.service';

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  private readonly clerk = createClerkClient({
    secretKey: getEnv().CLERK_SECRET_KEY,
  });

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
      const payload = await this.clerk.verifyToken(token);

      if (!payload.org_id) {
        throw new UnauthorizedException('No organisation in token — user must belong to a Clerk org');
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
