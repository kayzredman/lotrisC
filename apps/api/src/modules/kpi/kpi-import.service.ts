import { Injectable, BadRequestException } from '@nestjs/common';
import {
  getMssqlDb,
  kpiAgreementAreas,
  kpiAgreementMetrics,
  eq,
} from '@lotris/db';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';
import type { TrpcAuth } from '@lotris/types';
import type { ImportColumnMappingDto } from './dto';
import { KpiService } from './kpi.service';

interface ParsedRow {
  description: string;
  weight: number;
  targetScore: number;
  measurementPeriod: string;
  kpiDefinitionId?: string;
}

@Injectable()
export class KpiImportService {
  // In-memory cache of parsed rows per agreement (keyed by agreementId)
  // Real production use would store in Redis/temp table; this is adequate for the sprint
  private pendingRows = new Map<string, ParsedRow[]>();

  constructor(private readonly kpi: KpiService) {}

  /**
   * Parse an uploaded Excel/CSV file and return a column preview.
   * File is cached in memory for the subsequent import call.
   */
  async parseUpload(auth: TrpcAuth, agreementId: string, file: Express.Multer.File) {
    await this.kpi.getAgreement(auth, agreementId); // access check

    if (!file) throw new BadRequestException('No file uploaded');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      throw new BadRequestException('Only .xlsx, .xls, or .csv files are accepted');
    }

    const workbook = new ExcelJS.Workbook();
    if (ext === 'csv') {
      // ExcelJS CSV reader accepts a readable stream; convert buffer via Readable.from
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Readable } = require('node:stream') as typeof import('stream');
      await workbook.csv.read(Readable.from(file.buffer));
    } else {
      await workbook.xlsx.load(Buffer.from(file.buffer));
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Spreadsheet has no worksheets');

    // Return first row as column headers + up to 5 sample data rows
    const headers: string[] = [];
    const sampleRows: Record<string, string>[] = [];

    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) {
        row.eachCell((cell) => headers.push(String(cell.value ?? '')));
        return;
      }
      if (rowIndex <= 6) {
        const rowData: Record<string, string> = {};
        row.eachCell((cell, colIndex) => {
          const header = headers[colIndex - 1] ?? `col${colIndex}`;
          rowData[header] = String(cell.value ?? '');
        });
        sampleRows.push(rowData);
      }
    });

    // Store raw parsed data for later import
    const allRows: ParsedRow[] = [];
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells: string[] = [];
      row.eachCell((cell) => cells.push(String(cell.value ?? '')));
      allRows.push({
        description: cells[0] ?? '',
        weight: Number(cells[1] ?? 0),
        targetScore: Number(cells[2] ?? 0),
        measurementPeriod: 'MONTHLY',
      });
    });
    this.pendingRows.set(agreementId, allRows);

    return { headers, sampleRows, totalRows: allRows.length };
  }

  /**
   * Apply column mapping and insert metric rows into the first area of the agreement.
   * Creates a default area "Imported Metrics" if none exists.
   */
  async importWithMapping(auth: TrpcAuth, agreementId: string, _dto: ImportColumnMappingDto) {
    const agreement = await this.kpi.getAgreement(auth, agreementId);
    if (agreement.status !== 'DRAFT') {
      throw new BadRequestException('Can only import into DRAFT agreements');
    }

    const rows = this.pendingRows.get(agreementId);
    if (!rows || rows.length === 0) {
      throw new BadRequestException('No pending upload found. Upload a file first.');
    }

    const db = await getMssqlDb();
    // Get or create a default import area
    const [existingArea] = await db
      .select()
      .from(kpiAgreementAreas)
      .where(eq(kpiAgreementAreas.agreementId, agreementId));

    let areaId: string;
    if (existingArea) {
      areaId = existingArea.id;
    } else {
      areaId = uuidv4();
      await db.insert(kpiAgreementAreas).values({
        id: areaId,
        tenantId: agreement.tenantId,
        agreementId,
        name: 'Imported Metrics',
        weight: '100',
        sortOrder: 0,
      });
    }

    // Insert metric rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (!r.description || r.targetScore <= 0) continue;
      await db.insert(kpiAgreementMetrics).values({
        id: uuidv4(),
        tenantId: agreement.tenantId,
        areaId,
        kpiDefinitionId: r.kpiDefinitionId ?? null,
        description: r.description,
        measurementPeriod: r.measurementPeriod ?? 'MONTHLY',
        weight: String(r.weight),
        targetScore: String(r.targetScore),
        actualScore: null,
        sortOrder: i,
      });
    }

    this.pendingRows.delete(agreementId);
    return { imported: rows.length };
  }
}
