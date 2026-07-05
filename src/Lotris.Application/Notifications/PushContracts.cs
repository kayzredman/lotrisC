namespace Lotris.Application.Notifications;

public sealed class PagerPushMessage
{
    public required Guid UserId { get; init; }
    public required string EventType { get; init; }
    public string? TicketRef { get; init; }
    public Guid? TicketId { get; init; }
    public string? Title { get; init; }
}

public interface IDeviceTokenRepository
{
    Task<DeviceTokenRecord> UpsertAsync(
        Guid userId,
        Guid tenantId,
        string platform,
        string token,
        string? deviceLabel,
        CancellationToken cancellationToken = default);

    Task<bool> RevokeAsync(Guid deviceId, Guid userId, CancellationToken cancellationToken = default);

    Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DeviceTokenRecord>> ListActiveForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}

public sealed class DeviceTokenRecord
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public Guid TenantId { get; init; }
    public string Platform { get; init; } = "";
    public string Token { get; init; } = "";
    public string? DeviceLabel { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public interface IPushNotificationService
{
    Task SendPagerAsync(PagerPushMessage message, CancellationToken cancellationToken = default);
}
