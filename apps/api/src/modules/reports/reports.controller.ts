import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session as Auth } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { ReportsService } from './reports.service';
import { GenerateReportDto, CreateScheduleDto } from './dto/index';

@Controller('api/v1/reports')
@UseGuards(ClerkJwtGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Auth() auth: TrpcAuth, @Body() dto: GenerateReportDto) {
    return this.reportsService.generateReport(auth, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@Auth() auth: TrpcAuth) {
    return this.reportsService.listReports(auth);
  }

  @Get(':id/status')
  @HttpCode(HttpStatus.OK)
  async status(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getJobStatus(auth, id);
  }

  @Get(':id/download')
  async download(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
  ) {
    const filePath = await this.reportsService.getFilePath(auth, id);
    const ext = path.extname(filePath);
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `lotris-report-${id}${ext}`;

    const stream = fs.createReadStream(filePath);
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', contentType);
    res.send(stream);
  }

  // ── Schedules ──────────────────────────────────────────────────────────────

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Auth() auth: TrpcAuth, @Body() dto: CreateScheduleDto) {
    return this.reportsService.createSchedule(auth, dto);
  }

  @Get('schedules')
  @HttpCode(HttpStatus.OK)
  async listSchedules(@Auth() auth: TrpcAuth) {
    return this.reportsService.listSchedules(auth);
  }

  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.deleteSchedule(auth, id);
  }
}
