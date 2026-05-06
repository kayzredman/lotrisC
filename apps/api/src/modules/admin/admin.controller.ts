import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Session } from '../auth/decorators/session.decorator';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import type { TrpcAuth } from '@lotris/types';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(ClerkJwtGuard, RoleGuard('ADMIN', 'SUPERADMIN'))
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Users ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all users for the authenticated tenant' })
  @Get('users')
  listUsers(@Session() session: TrpcAuth) {
    return this.adminService.listUsers(session.tenantId);
  }

  @ApiOperation({ summary: 'Create a new user' })
  @Post('users')
  createUser(@Session() session: TrpcAuth, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(session.tenantId, session.userId, dto);
  }

  @ApiOperation({ summary: 'Update a user' })
  @Patch('users/:id')
  updateUser(
    @Session() session: TrpcAuth,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(session.tenantId, session.userId, userId, dto);
  }

  @ApiOperation({ summary: 'Deactivate a user (soft delete)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('users/:id')
  deactivateUser(@Session() session: TrpcAuth, @Param('id') userId: string) {
    return this.adminService.deactivateUser(session.tenantId, session.userId, userId);
  }

  @ApiOperation({ summary: 'Assign a role to a user' })
  @Patch('users/:id/role')
  assignRole(
    @Session() session: TrpcAuth,
    @Param('id') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.adminService.assignRole(session.tenantId, session.userId, userId, dto.roleId);
  }

  // ── Teams ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all teams for the authenticated tenant' })
  @Get('teams')
  listTeams(@Session() session: TrpcAuth) {
    return this.adminService.listTeams(session.tenantId);
  }

  @ApiOperation({ summary: 'Create a new team' })
  @Post('teams')
  createTeam(@Session() session: TrpcAuth, @Body() dto: CreateTeamDto) {
    return this.adminService.createTeam(session.tenantId, session.userId, dto);
  }

  @ApiOperation({ summary: 'Update a team' })
  @Patch('teams/:id')
  updateTeam(
    @Session() session: TrpcAuth,
    @Param('id') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.adminService.updateTeam(session.tenantId, session.userId, teamId, dto);
  }
}
