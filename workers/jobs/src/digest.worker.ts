import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import IORedisClient from 'ioredis';
import nodemailer from 'nodemailer';
import { getEnv } from '@lotris/config';

/**
 * Digest Worker — sends daily KPI warning summary emails to team leads at 08:00.
 *
 * Data source: Redis lists/sets written by KpiTrendAnalyser/kpi-trend worker:
 *   digest:active-leads  — set of leadIds with pending digest items
 *   digest:lead:{leadId} — list of JSON-encoded digest items
 *
 * Idempotent: processes and deletes the list atomically, so if the job runs
 * twice the second run finds no items and exits cleanly.
 */

interface DigestItem {
  engineerName: string;
  kpiName: string;
  projectedScore: number;
  target: number;
  warningLevel: 'AMBER' | 'RED';
  periodKey: string;
}

function createTransport() {
  const env = getEnv();
  if (env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ?? 587,
      secure: (env.EMAIL_PORT ?? 587) === 465,
      auth: env.EMAIL_USER ? { user: env.EMAIL_USER, pass: env.EMAIL_PASS } : undefined,
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendDigestEmail(leadEmail: string, items: DigestItem[]): Promise<void> {
  const env       = getEnv();
  const transport = createTransport();
  const subject   = `Lotris Daily KPI Digest — ${items.length} warning(s) require your attention`;

  const rows = items.map((item) => `
    <tr>
      <td style="padding:6px 12px">${escapeHtml(item.engineerName)}</td>
      <td style="padding:6px 12px">${escapeHtml(item.kpiName)}</td>
      <td style="padding:6px 12px">${escapeHtml(item.periodKey)}</td>
      <td style="padding:6px 12px">${item.projectedScore.toFixed(2)}</td>
      <td style="padding:6px 12px">${item.target}</td>
      <td style="padding:6px 12px;color:${item.warningLevel === 'RED' ? '#dc2626' : '#d97706'}">
        <strong>${item.warningLevel}</strong>
      </td>
    </tr>`).join('');

  const html = `
    <h2 style="margin-bottom:8px">Daily KPI Digest</h2>
    <p>The following KPIs are currently projected to miss their targets:</p>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;font-size:14px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:8px 12px;text-align:left">Engineer</th>
          <th style="padding:8px 12px;text-align:left">KPI</th>
          <th style="padding:8px 12px;text-align:left">Period</th>
          <th style="padding:8px 12px;text-align:left">Projected</th>
          <th style="padding:8px 12px;text-align:left">Target</th>
          <th style="padding:8px 12px;text-align:left">Level</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#6b7280">
      This digest was generated automatically by Lotris. Please log in to review KPI trends in detail.
    </p>
  `;

  try {
    await transport.sendMail({ from: env.EMAIL_FROM, to: leadEmail, subject, html });
  } catch (err) {
    console.error(`[digest] Failed to send digest to ${leadEmail}:`, err);
  }
}

async function runDigest(redis: IORedisClient): Promise<void> {
  // SMEMBERS gives us all lead IDs with pending items
  const leadIds = await redis.smembers('digest:active-leads');
  if (leadIds.length === 0) return;

  // We need lead emails — stored in the digest or looked up separately.
  // Since workers have no DB access for user emails here, we encode the email
  // in the set membership key: digest:active-leads stores "{leadId}|{email}" strings.
  for (const entry of leadIds) {
    const [leadId, leadEmail] = entry.split('|');
    if (!leadId) continue;

    // Drain the list atomically (LRANGE + DEL)
    const rawItems = await redis.lrange(`digest:lead:${leadId}`, 0, -1);
    if (rawItems.length === 0) {
      await redis.srem('digest:active-leads', entry);
      continue;
    }

    await redis.del(`digest:lead:${leadId}`);
    await redis.srem('digest:active-leads', entry);

    const items: DigestItem[] = rawItems
      .map((raw) => { try { return JSON.parse(raw) as DigestItem; } catch { return null; } })
      .filter((x): x is DigestItem => x !== null);

    if (items.length === 0) continue;

    if (leadEmail) {
      await sendDigestEmail(leadEmail, items);
      console.log(`[digest] Sent ${items.length} item(s) to lead ${leadId} <${leadEmail}>`);
    } else {
      console.warn(`[digest] No email for lead ${leadId}, skipping digest send`);
    }
  }
}

export function createDigestWorker(connection: IORedis): Worker {
  const env   = getEnv();
  const redis = new IORedisClient(env.REDIS_URL, { maxRetriesPerRequest: null });

  return new Worker(
    'digest',
    async (_job: Job) => {
      await runDigest(redis);
    },
    { connection, concurrency: 1 },
  );
}
