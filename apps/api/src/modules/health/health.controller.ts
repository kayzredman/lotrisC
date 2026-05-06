import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: 'API liveness check' })
  @Get()
  check() {
    return {
      status: 'UP',
      service: 'api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
