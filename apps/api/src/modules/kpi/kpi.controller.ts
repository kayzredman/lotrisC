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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { Session as Auth } from '../auth/decorators/session.decorator';
import type { TrpcAuth } from '@lotris/types';
import { KpiService } from './kpi.service';
import { KpiImportService } from './kpi-import.service';
import {
  CreateKpiDefinitionDto,
  UpdateKpiDefinitionDto,
  SetTeamTargetDto,
  CreateKpiAssignmentDto,
  CreateKpiAgreementDto,
  UpsertAgreementAreasDto,
  ImportColumnMappingDto,
  CreateActualDto,
} from './dto';

@Controller('api/v1/kpi')
@UseGuards(ClerkJwtGuard)
export class KpiController {
  constructor(
    private readonly kpi: KpiService,
    private readonly importSvc: KpiImportService,
  ) {}

  // ── KPI Definitions ────────────────────────────────────────────────────

  @Get('definitions')
  listDefinitions(@Auth() auth: TrpcAuth) {
    return this.kpi.listDefinitions(auth);
  }

  @Get('definitions/:id')
  getDefinition(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.getDefinition(auth, id);
  }

  @Post('definitions')
  createDefinition(@Auth() auth: TrpcAuth, @Body() dto: CreateKpiDefinitionDto) {
    return this.kpi.createDefinition(auth, dto);
  }

  @Patch('definitions/:id')
  updateDefinition(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiDefinitionDto,
  ) {
    return this.kpi.updateDefinition(auth, id, dto);
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveDefinition(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.archiveDefinition(auth, id);
  }

  // ── Team Targets ───────────────────────────────────────────────────────

  @Get('definitions/:id/team-targets')
  getTeamTargets(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.getTeamTargets(auth, id);
  }

  @Patch('definitions/:id/team-targets')
  setTeamTarget(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTeamTargetDto,
  ) {
    return this.kpi.setTeamTarget(auth, id, dto);
  }

  // ── Engineer Assignments ───────────────────────────────────────────────

  @Get('assignments')
  listAssignments(
    @Auth() auth: TrpcAuth,
    @Query('engineerId') engineerId?: string,
    @Query('periodKey') periodKey?: string,
  ) {
    return this.kpi.listAssignments(auth, engineerId, periodKey);
  }

  @Post('assignments')
  createAssignment(@Auth() auth: TrpcAuth, @Body() dto: CreateKpiAssignmentDto) {
    return this.kpi.createAssignment(auth, dto);
  }

  // ── Agreements ─────────────────────────────────────────────────────────

  @Get('agreements')
  listAgreements(
    @Auth() auth: TrpcAuth,
    @Query('engineerId') engineerId?: string,
    @Query('periodKey') periodKey?: string,
  ) {
    return this.kpi.listAgreements(auth, engineerId, periodKey);
  }

  @Post('agreements')
  createAgreement(@Auth() auth: TrpcAuth, @Body() dto: CreateKpiAgreementDto) {
    return this.kpi.createAgreement(auth, dto);
  }

  @Get('agreements/:id')
  getAgreement(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.getAgreementWithAreas(auth, id);
  }

  @Patch('agreements/:id/areas')
  upsertAreas(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertAgreementAreasDto,
  ) {
    return this.kpi.upsertAgreementAreas(auth, id, dto);
  }

  @Post('agreements/:id/submit')
  @HttpCode(HttpStatus.OK)
  submitAgreement(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.submitAgreement(auth, id);
  }

  @Post('agreements/:id/accept')
  @HttpCode(HttpStatus.OK)
  acceptAgreement(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.acceptAgreement(auth, id);
  }

  // ── Document Upload ────────────────────────────────────────────────────

  @Post('agreements/:id/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadAgreementFile(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importSvc.parseUpload(auth, id, file);
  }

  @Post('agreements/:id/import')
  importAgreementRows(
    @Auth() auth: TrpcAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportColumnMappingDto,
  ) {
    return this.importSvc.importWithMapping(auth, id, dto);
  }

  // ── Scoring ────────────────────────────────────────────────────────────

  @Post('agreements/:id/score')
  @HttpCode(HttpStatus.OK)
  computeScore(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.computeScore(auth, id);
  }

  @Get('agreements/:id/result')
  getResult(@Auth() auth: TrpcAuth, @Param('id', ParseUUIDPipe) id: string) {
    return this.kpi.getResult(auth, id);
  }

  // ── Actuals ────────────────────────────────────────────────────────────

  @Get('actuals')
  listActuals(
    @Auth() auth: TrpcAuth,
    @Query('engineerId') engineerId?: string,
    @Query('metricId') metricId?: string,
  ) {
    return this.kpi.listActuals(auth, engineerId, metricId);
  }

  @Post('actuals')
  createActual(@Auth() auth: TrpcAuth, @Body() dto: CreateActualDto) {
    return this.kpi.createActual(auth, dto);
  }
}
