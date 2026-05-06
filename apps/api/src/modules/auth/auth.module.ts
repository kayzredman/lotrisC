import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkJwtGuard } from './clerk-jwt.guard';

@Global()
@Module({
  providers: [AuthService, ClerkJwtGuard],
  exports: [AuthService, ClerkJwtGuard],
})
export class AuthModule {}
