import { Injectable, Logger } from '@nestjs/common';
import { getPostgresDb, reportConfig, eq } from '@lotris/db';
import { v4 as uuid } from 'uuid';
import type { ReportConfigDefaults } from '@lotris/db';
import type { UpdateReportConfigDto } from './dto/index';

const DEFAULTS: ReportConfigDefaults = {
  brandName: 'Lotris',
  defaultTimezone: 'UTC',
  attachmentSizeLimitMb: 10,
  retentionDays: 30,
  defaultRecipients: [],
};

@Injectable()
export class ReportsConfigService {
  private readonly logger = new Logger(ReportsConfigService.name);

  async getConfig(tenantId: string): Promise<ReportConfigDefaults> {
    const pg = getPostgresDb();
    const rows = await pg
      .select()
      .from(reportConfig)
      .where(eq(reportConfig.tenantId, tenantId))
      .limit(1);

    const row = rows[0];
    if (!row) return { ...DEFAULTS };

    let defaultRecipients: string[] = [];
    if (row.defaultRecipients) {
      try {
        defaultRecipients = JSON.parse(row.defaultRecipients) as string[];
      } catch {
        this.logger.warn(`Invalid defaultRecipients JSON for tenant ${tenantId}`);
      }
    }

    return {
      brandName: row.brandName ?? DEFAULTS.brandName,
      defaultTimezone: row.defaultTimezone ?? DEFAULTS.defaultTimezone,
      attachmentSizeLimitMb: row.attachmentSizeLimitMb ?? DEFAULTS.attachmentSizeLimitMb,
      retentionDays: row.retentionDays ?? DEFAULTS.retentionDays,
      defaultRecipients,
    };
  }

  async upsertConfig(tenantId: string, dto: UpdateReportConfigDto): Promise<void> {
    const pg = getPostgresDb();
    const existing = await pg
      .select({ id: reportConfig.id })
      .from(reportConfig)
      .where(eq(reportConfig.tenantId, tenantId))
      .limit(1);

    if (existing[0]) {
      await pg
        .update(reportConfig)
        .set({
          ...(dto.brandName !== undefined && { brandName: dto.brandName }),
          ...(dto.defaultTimezone !== undefined && { defaultTimezone: dto.defaultTimezone }),
          ...(dto.attachmentSizeLimitMb !== undefined && { attachmentSizeLimitMb: dto.attachmentSizeLimitMb }),
          ...(dto.retentionDays !== undefined && { retentionDays: dto.retentionDays }),
          ...(dto.defaultRecipients !== undefined && { defaultRecipients: dto.defaultRecipients }),
          updatedAt: new Date(),
        })
        .where(eq(reportConfig.tenantId, tenantId));
    } else {
      await pg.insert(reportConfig).values({
        id: uuid(),
        tenantId,
        brandName: dto.brandName,
        defaultTimezone: dto.defaultTimezone,
        attachmentSizeLimitMb: dto.attachmentSizeLimitMb,
        retentionDays: dto.retentionDays,
        defaultRecipients: dto.defaultRecipients,
      });
    }
  }

  /** Merge per-schedule recipients with tenant default recipients (deduped). */
  mergeRecipients(scheduleRecipients: string[], defaultRecipients: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const email of [...defaultRecipients, ...scheduleRecipients]) {
      const lower = email.toLowerCase().trim();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        result.push(lower);
      }
    }
    return result;
  }
}
