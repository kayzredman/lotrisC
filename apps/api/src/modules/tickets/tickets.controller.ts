import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketStatusDto,
  CreateCommentDto,
  CreateAttachmentRefDto,
  TicketListQueryDto,
} from './dto';

@UseGuards(ClerkJwtGuard)
@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Session() auth: TrpcAuth, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(auth, dto);
  }

  @Get()
  list(@Session() auth: TrpcAuth, @Query() query: TicketListQueryDto) {
    return this.ticketsService.list(auth, query);
  }

  @Get(':id')
  getOne(@Session() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findById(auth, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Session() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(auth, id, dto);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  addComment(
    @Session() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.ticketsService.addComment(auth, id, dto);
  }

  @Get(':id/comments')
  getComments(@Session() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.getComments(auth, id);
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  addAttachment(
    @Session() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAttachmentRefDto,
  ) {
    return this.ticketsService.addAttachmentRef(auth, id, dto);
  }

  // ── History ───────────────────────────────────────────────────────────────

  @Get(':id/history')
  getHistory(@Session() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.getHistory(auth, id);
  }
}
