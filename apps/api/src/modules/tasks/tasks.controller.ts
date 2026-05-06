import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session as Auth } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskListQueryDto,
  CreateChecklistItemDto,
  AddAssigneesDto,
} from './dto';

@Controller('api/v1/tasks')
@UseGuards(ClerkJwtGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** POST /api/v1/tasks — create a task (lead-assign or self-log) */
  @Post()
  create(@Auth() auth: TrpcAuth, @Body() dto: CreateTaskDto) {
    return this.tasks.create(auth, dto);
  }

  /** GET /api/v1/tasks — list tasks visible to the caller */
  @Get()
  list(@Auth() auth: TrpcAuth, @Query() query: TaskListQueryDto) {
    return this.tasks.list(auth, query);
  }

  /** GET /api/v1/tasks/:id */
  @Get(':id')
  getById(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.findById(auth, id);
  }

  /** PATCH /api/v1/tasks/:id */
  @Patch(':id')
  update(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(auth, id, dto);
  }

  // ── Checklist ────────────────────────────────────────────────────────────

  /** POST /api/v1/tasks/:id/checklist */
  @Post(':id/checklist')
  addChecklistItem(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.tasks.addChecklistItem(auth, id, dto);
  }

  /** PATCH /api/v1/tasks/:id/checklist/:itemId/toggle */
  @Patch(':id/checklist/:itemId/toggle')
  @HttpCode(HttpStatus.OK)
  toggleChecklistItem(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.tasks.toggleChecklistItem(auth, id, itemId);
  }

  /** DELETE /api/v1/tasks/:id/checklist/:itemId */
  @Delete(':id/checklist/:itemId')
  @HttpCode(HttpStatus.OK)
  deleteChecklistItem(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.tasks.deleteChecklistItem(auth, id, itemId);
  }

  // ── Assignees ─────────────────────────────────────────────────────────────

  /** POST /api/v1/tasks/:id/assignees — add engineers (TEAM_LEAD+) */
  @Post(':id/assignees')
  addAssignees(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAssigneesDto,
  ) {
    return this.tasks.addAssignees(auth, id, dto);
  }

  /** POST /api/v1/tasks/:id/complete — mark own assignment done */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  markComplete(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasks.markAssignmentComplete(auth, id);
  }
}
