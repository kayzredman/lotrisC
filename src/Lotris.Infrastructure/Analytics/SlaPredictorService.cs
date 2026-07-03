using Lotris.Application.Analytics;
using Lotris.Application.Notifications;
using Lotris.Application.Tickets;
using Lotris.Domain.Tickets;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Analytics;

public sealed class SlaPredictorService : ISlaPredictorService
{
    private readonly ITicketRepository _tickets;
    private readonly INotificationEnqueuer _notifications;
    private readonly ILogger<SlaPredictorService> _logger;

    public SlaPredictorService(
        ITicketRepository tickets,
        INotificationEnqueuer notifications,
        ILogger<SlaPredictorService> logger)
    {
        _tickets = tickets;
        _notifications = notifications;
        _logger = logger;
    }

    public string ComputeWarningLevel(DateTime assignedAt, DateTime slaDeadline, DateTime now)
    {
        var total = slaDeadline - assignedAt;
        if (total <= TimeSpan.Zero)
        {
            return "RED";
        }

        var elapsed = now - assignedAt;
        var pct = elapsed / total;
        if (pct >= 0.9)
        {
            return "RED";
        }

        if (pct >= 0.7)
        {
            return "AMBER";
        }

        return "NONE";
    }

    public async Task ScanAndUpdateAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var (rows, _) = await _tickets.ListAsync(new TicketListFilters
        {
            TenantId = tenantId,
            Status = TicketStatus.InProgress,
            Page = 1,
            Limit = 500,
        }, cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var ticket in rows.Where(t => t.AssignedAt.HasValue && t.SlaResolutionDeadline.HasValue))
        {
            var newLevel = ComputeWarningLevel(
                ticket.AssignedAt!.Value,
                ticket.SlaResolutionDeadline!.Value,
                now);

            if (!string.Equals(newLevel, ticket.SlaWarningLevel, StringComparison.Ordinal))
            {
                await _tickets.UpdateSlaWarningLevelAsync(tenantId, ticket.Id, newLevel, cancellationToken);
            }

            if (newLevel is "AMBER" or "RED")
            {
                var minutesRemaining = Math.Max(
                    1,
                    (int)Math.Round((ticket.SlaResolutionDeadline!.Value - now).TotalMinutes));
                _notifications.EnqueueNotification(new NotificationPayload
                {
                    Type = "SLA_WARNING",
                    TenantId = tenantId,
                    TicketId = ticket.Id,
                    TicketTitle = ticket.Title,
                    AssigneeId = ticket.AssigneeId,
                    WarningLevel = newLevel,
                    SlaDeadline = ticket.SlaResolutionDeadline.Value.ToString("O"),
                    MinutesRemaining = minutesRemaining,
                });

                _logger.LogInformation(
                    "SLA {Level} for ticket {TicketId} ({Minutes}m remaining)",
                    newLevel,
                    ticket.Id,
                    minutesRemaining);
            }
        }
    }
}
