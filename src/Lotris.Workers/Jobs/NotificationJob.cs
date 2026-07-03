using System.Text.Json;
using Lotris.Application.Notifications;
using Microsoft.Extensions.Logging;

namespace Lotris.Workers.Jobs;

public sealed class NotificationJob : INotificationJob
{
    private readonly IEmailSender _email;
    private readonly INotificationPublisher _publisher;
    private readonly ILogger<NotificationJob> _logger;

    public NotificationJob(
        IEmailSender email,
        INotificationPublisher publisher,
        ILogger<NotificationJob> logger)
    {
        _email = email;
        _publisher = publisher;
        _logger = logger;
    }

    public async Task ProcessAsync(NotificationPayload payload, CancellationToken cancellationToken = default)
    {
        switch (payload.Type)
        {
            case "INTAKE_ACK":
                await SendIntakeAckAsync(payload, cancellationToken);
                break;
            case "INTAKE_RESOLVED":
                await SendIntakeResolvedAsync(payload, cancellationToken);
                break;
            case "SLA_WARNING":
                await SendSlaWarningAsync(payload, cancellationToken);
                break;
            case "KPI_WARNING":
                await PublishSseAsync(payload.EngineerId, payload, cancellationToken);
                break;
            case "TICKET_CREATED":
            case "TICKET_ASSIGNED":
            case "TICKET_RESOLVED":
            case "TICKET_ESCALATED":
                _logger.LogInformation(
                    "Internal notification {Type} ticketId={TicketId}",
                    payload.Type,
                    payload.TicketId);
                if (payload.RecipientId.HasValue)
                {
                    await PublishSseAsync(payload.RecipientId, payload, cancellationToken);
                }

                break;
            default:
                _logger.LogWarning("Unknown notification type {Type}", payload.Type);
                break;
        }
    }

    private async Task SendIntakeAckAsync(NotificationPayload payload, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(payload.RequesterEmail))
        {
            return;
        }

        await _email.SendAsync(new EmailMessage
        {
            To = payload.RequesterEmail,
            Subject = $"[{payload.TicketRef}] We've received your request",
            HtmlBody = $"""
                <p>Hi {Escape(payload.RequesterName ?? "there")},</p>
                <p>Thank you for reaching out to IT Support. We have received your request.</p>
                <p><strong>{Escape(payload.TicketRef ?? "")}</strong> — {Escape(payload.TicketTitle ?? "")}</p>
                """,
            TextBody = $"We've received your request ({payload.TicketRef}: {payload.TicketTitle}).",
        }, cancellationToken);
    }

    private async Task SendIntakeResolvedAsync(NotificationPayload payload, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(payload.RequesterEmail))
        {
            return;
        }

        await _email.SendAsync(new EmailMessage
        {
            To = payload.RequesterEmail,
            Subject = $"[{payload.TicketRef}] Your request has been resolved",
            HtmlBody = $"""
                <p>Hi {Escape(payload.RequesterName ?? "there")},</p>
                <p>Your request has been resolved by {Escape(payload.TeamName ?? "IT Support")}.</p>
                <p><strong>{Escape(payload.TicketRef ?? "")}</strong> — {Escape(payload.TicketTitle ?? "")}</p>
                """,
            TextBody = $"Your request ({payload.TicketRef}) has been resolved.",
        }, cancellationToken);
    }

    private async Task SendSlaWarningAsync(NotificationPayload payload, CancellationToken cancellationToken)
    {
        var recipients = new List<string>();
        if (!string.IsNullOrWhiteSpace(payload.AssigneeEmail))
        {
            recipients.Add(payload.AssigneeEmail);
        }

        if (!string.IsNullOrWhiteSpace(payload.LeadEmail))
        {
            recipients.Add(payload.LeadEmail);
        }

        var subject = $"{payload.WarningLevel}: Ticket [{payload.TicketRef}] SLA breach imminent";
        foreach (var to in recipients.Distinct())
        {
            await _email.SendAsync(new EmailMessage
            {
                To = to,
                Subject = subject,
                HtmlBody = $"""
                    <p>Ticket <strong>[{Escape(payload.TicketRef ?? "")}] {Escape(payload.TicketTitle ?? "")}</strong></p>
                    <p>Warning level: {Escape(payload.WarningLevel ?? "")}</p>
                    <p>Time remaining: {payload.MinutesRemaining} minutes</p>
                    """,
                TextBody = subject,
            }, cancellationToken);
        }

        var ssePayload = JsonSerializer.Serialize(new
        {
            type = "SLA_WARNING",
            payload.TicketRef,
            payload.TicketTitle,
            payload.WarningLevel,
            payload.MinutesRemaining,
        });

        if (payload.AssigneeId.HasValue)
        {
            await _publisher.PublishAsync(payload.AssigneeId.Value, ssePayload, cancellationToken);
        }

        if (payload.LeadId.HasValue)
        {
            await _publisher.PublishAsync(payload.LeadId.Value, ssePayload, cancellationToken);
        }
    }

    private Task PublishSseAsync(Guid? userId, NotificationPayload payload, CancellationToken cancellationToken)
    {
        if (!userId.HasValue)
        {
            return Task.CompletedTask;
        }

        var json = JsonSerializer.Serialize(payload);
        return _publisher.PublishAsync(userId.Value, json, cancellationToken);
    }

    private static string Escape(string value) =>
        value
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;");
}
