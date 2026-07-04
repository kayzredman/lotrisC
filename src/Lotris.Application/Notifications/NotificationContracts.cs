namespace Lotris.Application.Notifications;

public sealed class NotificationPayload
{
    public required string Type { get; init; }
    public Guid? TenantId { get; init; }
    public Guid? TicketId { get; init; }
    public string? TicketTitle { get; init; }
    public string? TicketRef { get; init; }
    public Guid? ActorId { get; init; }
    public Guid? RecipientId { get; init; }
    public string? RequesterEmail { get; init; }
    public string? RequesterName { get; init; }
    public string? TeamName { get; init; }
    public string? AssigneeEmail { get; init; }
    public Guid? AssigneeId { get; init; }
    public Guid? LeadId { get; init; }
    public string? LeadEmail { get; init; }
    public string? WarningLevel { get; init; }
    public string? SlaDeadline { get; init; }
    public int? MinutesRemaining { get; init; }
    public string? KpiName { get; init; }
    public double? ProjectedScore { get; init; }
    public double? Target { get; init; }
    public string? PeriodKey { get; init; }
    public Guid? EngineerId { get; init; }
    public string? EngineerName { get; init; }
}

public interface INotificationEnqueuer
{
    void EnqueueNotification(NotificationPayload payload);
}

public interface INotificationPublisher
{
    Task PublishAsync(Guid userId, string jsonPayload, CancellationToken cancellationToken = default);
}

public sealed class EmailMessage
{
    public required string To { get; init; }
    public required string Subject { get; init; }
    public required string HtmlBody { get; init; }
    public string? TextBody { get; init; }
    public string? AttachmentPath { get; init; }
    public string? AttachmentName { get; init; }
}

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public interface INotificationJob
{
    Task ProcessAsync(NotificationPayload payload, CancellationToken cancellationToken = default);
}
