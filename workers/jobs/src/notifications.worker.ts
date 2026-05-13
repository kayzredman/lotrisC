import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import { getEnv } from '@lotris/config';

/**
 * Notifications worker — processes all jobs from the 'notifications' BullMQ queue.
 *
 * Job types handled:
 *   INTAKE_ACK       — acknowledgement email to external requester on ticket creation
 *   INTAKE_RESOLVED  — resolution email to external requester when ticket → RESOLVED
 *   TICKET_CREATED, TICKET_ASSIGNED, TICKET_RESOLVED, TICKET_ESCALATED
 *                    — internal notifications (logged, extensible for future in-app/email)
 */

interface IntakeAckJob {
  type: 'INTAKE_ACK';
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  requesterEmail: string;
  requesterName: string;
}

interface IntakeResolvedJob {
  type: 'INTAKE_RESOLVED';
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  requesterEmail: string;
  requesterName: string;
  teamName: string;
}

interface InternalTicketJob {
  type: 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'TICKET_RESOLVED' | 'TICKET_ESCALATED';
  tenantId: string;
  ticketId: string;
  ticketTitle: string;
  actorId: string;
  recipientId?: string;
}

interface SlaWarningJob {
  type: 'SLA_WARNING';
  tenantId: string;
  ticketId: string;
  ticketRef: string;
  ticketTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  leadId: string | null;
  leadEmail: string | null;
  warningLevel: 'AMBER' | 'RED';
  slaDeadline: string;
  minutesRemaining: number;
}

interface KpiWarningJob {
  type: 'KPI_WARNING';
  tenantId: string;
  engineerId: string;
  engineerName: string;
  kpiName: string;
  projectedScore: number;
  target: number;
  warningLevel: 'AMBER' | 'RED';
  periodKey: string;
}

type NotificationJob = IntakeAckJob | IntakeResolvedJob | InternalTicketJob | SlaWarningJob | KpiWarningJob;

function createTransport() {
  const env = getEnv();

  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    // Return a test account transport if email is not configured (dev mode)
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE === 'true',
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
}

async function sendIntakeAck(payload: IntakeAckJob): Promise<void> {
  const env = getEnv();
  const transport = createTransport();
  const appUrl = env.APP_BASE_URL;

  const subject = `[${payload.ticketRef}] We've received your request`;
  const html = `
    <p>Hi ${escapeHtml(payload.requesterName)},</p>
    <p>Thank you for reaching out to IT Support. We have received your request and our team will be in touch with you soon.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr><td style="color:#666">Reference</td><td><strong>${escapeHtml(payload.ticketRef)}</strong></td></tr>
      <tr><td style="color:#666">Subject</td><td>${escapeHtml(payload.ticketTitle)}</td></tr>
    </table>
    <p>Please quote your reference number in any follow-up communication.</p>
    <p style="color:#888;font-size:13px">This is an automated message — please do not reply directly to this email.</p>
  `;

  const result = await transport.sendMail({
    from: env.EMAIL_FROM,
    to: payload.requesterEmail,
    subject,
    html,
    text: `Hi ${payload.requesterName},\n\nWe've received your request (${payload.ticketRef}: ${payload.ticketTitle}).\nOur team will be in touch soon.\n\nPlease quote ${payload.ticketRef} in any follow-up.`,
  });

  if (env.EMAIL_HOST) {
    console.log(`[notifications] ACK email sent to ${payload.requesterEmail} — ${payload.ticketRef}`);
  } else {
    console.log(`[notifications] DEV — ACK email (not sent):`, JSON.stringify(result));
  }
}

async function sendIntakeResolved(payload: IntakeResolvedJob): Promise<void> {
  const env = getEnv();
  const transport = createTransport();
  const appUrl = env.APP_BASE_URL;
  const newRequestUrl = `${appUrl}/request`;

  const subject = `[${payload.ticketRef}] Your request has been resolved`;
  const html = `
    <p>Hi ${escapeHtml(payload.requesterName)},</p>
    <p>Your IT support request has been resolved by the <strong>${escapeHtml(payload.teamName)}</strong> team.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr><td style="color:#666">Reference</td><td><strong>${escapeHtml(payload.ticketRef)}</strong></td></tr>
      <tr><td style="color:#666">Subject</td><td>${escapeHtml(payload.ticketTitle)}</td></tr>
      <tr><td style="color:#666">Resolved by</td><td>IT ${escapeHtml(payload.teamName)}</td></tr>
    </table>
    <p>Still having issues? <a href="${newRequestUrl}">Submit a new request</a> and reference ${escapeHtml(payload.ticketRef)}.</p>
    <p style="color:#888;font-size:13px">This is an automated message — please do not reply directly to this email.</p>
  `;

  const result = await transport.sendMail({
    from: env.EMAIL_FROM,
    to: payload.requesterEmail,
    subject,
    html,
    text: `Hi ${payload.requesterName},\n\nYour request (${payload.ticketRef}: ${payload.ticketTitle}) has been resolved by IT ${payload.teamName}.\n\nStill having issues? Submit a new request at: ${newRequestUrl}\nPlease reference ${payload.ticketRef}.`,
  });

  if (env.EMAIL_HOST) {
    console.log(`[notifications] RESOLVED email sent to ${payload.requesterEmail} — ${payload.ticketRef}`);
  } else {
    console.log(`[notifications] DEV — RESOLVED email (not sent):`, JSON.stringify(result));
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendSlaWarning(payload: SlaWarningJob, connection: IORedis): Promise<void> {
  const env = getEnv();
  const transport = createTransport();
  const levelLabel = payload.warningLevel === 'RED' ? '🔴 URGENT' : '🟡 Warning';
  const subject = `${levelLabel}: Ticket [${payload.ticketRef}] SLA breach imminent (${payload.minutesRemaining}m remaining)`;
  const html = `
    <p>The following ticket is at risk of breaching its SLA resolution deadline.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr><td style="color:#666">Ticket</td><td><strong>[${escapeHtml(payload.ticketRef)}] ${escapeHtml(payload.ticketTitle)}</strong></td></tr>
      <tr><td style="color:#666">Warning</td><td><strong style="color:${payload.warningLevel === 'RED' ? '#dc2626' : '#d97706'}">${payload.warningLevel}</strong></td></tr>
      <tr><td style="color:#666">Time remaining</td><td><strong>${payload.minutesRemaining} minutes</strong></td></tr>
      <tr><td style="color:#666">SLA deadline</td><td>${new Date(payload.slaDeadline).toLocaleString()}</td></tr>
    </table>
    <p>Please action this ticket immediately to avoid a breach.</p>
  `;
  const text = `${levelLabel}: Ticket [${payload.ticketRef}] ${payload.ticketTitle} — ${payload.minutesRemaining} minutes until SLA breach. SLA deadline: ${payload.slaDeadline}`;

  const recipients: string[] = [payload.assigneeEmail];
  if (payload.leadEmail) recipients.push(payload.leadEmail);

  for (const to of recipients) {
    try {
      await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    } catch (err) {
      console.error(`[notifications] Failed to send SLA_WARNING email to ${to}:`, err);
    }
  }

  // Push real-time SSE event via Redis pub/sub
  const ssePayload = JSON.stringify({
    type: 'SLA_WARNING',
    ticketRef: payload.ticketRef,
    ticketTitle: payload.ticketTitle,
    warningLevel: payload.warningLevel,
    minutesRemaining: payload.minutesRemaining,
  });
  const sseRecipients = [payload.assigneeId];
  if (payload.leadId) sseRecipients.push(payload.leadId);
  await Promise.all(sseRecipients.map((id) => connection.publish(`sse:user:${id}`, ssePayload)));
}

async function handleKpiWarning(payload: KpiWarningJob, connection: IORedis): Promise<void> {
  // KPI_WARNING = in-app SSE only (no email; email digest is handled by digest.worker.ts)
  const ssePayload = JSON.stringify({
    type: 'KPI_WARNING',
    kpiName: payload.kpiName,
    projectedScore: payload.projectedScore,
    target: payload.target,
    warningLevel: payload.warningLevel,
    periodKey: payload.periodKey,
  });
  await connection.publish(`sse:user:${payload.engineerId}`, ssePayload);
}

export function createNotificationsWorker(connection: IORedis): Worker {
  return new Worker<NotificationJob>(
    'notifications',
    async (job: Job<NotificationJob>) => {
      const payload = job.data;

      switch (payload.type) {
        case 'INTAKE_ACK':
          await sendIntakeAck(payload);
          break;

        case 'INTAKE_RESOLVED':
          await sendIntakeResolved(payload);
          break;

        case 'SLA_WARNING':
          await sendSlaWarning(payload, connection);
          break;

        case 'KPI_WARNING':
          await handleKpiWarning(payload, connection);
          break;

        case 'TICKET_CREATED':
        case 'TICKET_ASSIGNED':
        case 'TICKET_RESOLVED':
        case 'TICKET_ESCALATED':
          // Internal notifications — log for now; extensible to in-app/push
          console.log(`[notifications] internal event: ${payload.type} ticketId=${payload.ticketId}`);
          break;

        default:
          console.warn(`[notifications] unknown job type: ${(payload as { type: string }).type}`);
      }
    },
    {
      connection,
      concurrency: 5,
    },
  );
}
