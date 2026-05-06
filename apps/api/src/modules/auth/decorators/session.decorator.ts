import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TrpcAuth } from '@lotris/types';

/**
 * Extracts the authenticated session from the request.
 * Must be used after @UseGuards(ClerkJwtGuard).
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(ClerkJwtGuard)
 *   getMe(@Session() session: TrpcAuth) { ... }
 */
export const Session = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TrpcAuth => {
    const request = ctx.switchToHttp().getRequest<{ auth: TrpcAuth }>();
    return request.auth;
  },
);
