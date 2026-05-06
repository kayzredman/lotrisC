import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkJwtGuard } from './clerk-jwt.guard';
import { RoleGuard } from './role.guard';

@Global()
@Module({
  providers: [AuthService, ClerkJwtGuard, RoleGuard],
  exports: [AuthService, ClerkJwtGuard, RoleGuard],
})
export class AuthModule {}
