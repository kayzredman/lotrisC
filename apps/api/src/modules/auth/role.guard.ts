import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import type { TrpcAuth, UserRole } from '@lotris/types';

/**
 * RoleGuard factory — use after ClerkJwtGuard.
 * Usage: @UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
 */
export function RoleGuard(...allowedRoles: UserRole[]): Type<CanActivate> {
  @Injectable()
  class MixinRoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<{ auth: TrpcAuth | undefined }>();
      const auth = request.auth;
      if (!auth) throw new ForbiddenException('Not authenticated');
      if (!allowedRoles.includes(auth.role)) {
        throw new ForbiddenException(`Role '${auth.role}' is not permitted for this action`);
      }
      return true;
    }
  }
  return mixin(MixinRoleGuard);
}
