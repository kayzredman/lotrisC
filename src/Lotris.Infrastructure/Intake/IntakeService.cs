using Dapper;
using Lotris.Application.Common;
using Lotris.Application.Intake;
using Lotris.Application.Notifications;
using Lotris.Application.Tickets;
using Lotris.Contracts.Intake;
using Lotris.Domain.Tickets;
using Lotris.Contracts.Tickets;
using Lotris.Infrastructure.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Intake;

public sealed class IntakeService
{
    private readonly ISqlConnectionFactory _connections;
    private readonly ITicketRepository _tickets;
    private readonly ITicketHistoryWriter _history;
    private readonly ISlaConfigRepository _slaConfigs;
    private readonly INotificationEnqueuer _notifications;
    private readonly IConnectionMultiplexer _redis;
    private readonly IntakeOptions _options;
    private readonly ILogger<IntakeService> _logger;

    public IntakeService(
        ISqlConnectionFactory connections,
        ITicketRepository tickets,
        ITicketHistoryWriter history,
        ISlaConfigRepository slaConfigs,
        INotificationEnqueuer notifications,
        IConnectionMultiplexer redis,
        IOptions<IntakeOptions> options,
        ILogger<IntakeService> logger)
    {
        _connections = connections;
        _tickets = tickets;
        _history = history;
        _slaConfigs = slaConfigs;
        _notifications = notifications;
        _redis = redis;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<bool> CheckRateLimitAsync(string ip, CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var key = $"rate:intake:{ip}";
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
            {
                await db.KeyExpireAsync(key, TimeSpan.FromHours(1));
            }

            return count <= 10;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis rate limit check failed — allowing request");
            return true;
        }
    }

    public async Task<(Guid TicketId, string TicketRef)> CreateFromWebFormAsync(
        CreatePublicRequest dto,
        CancellationToken cancellationToken = default)
    {
        var systemUserId = _options.SystemUserId
            ?? throw new BadRequestException("Ticket intake is not configured for this system");

        await EnsureSystemUserAsync(dto.TenantId, systemUserId, cancellationToken);

        var routing = await GetCategoryRoutingAsync(dto.TenantId, dto.Category, cancellationToken);
        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        var teamId = routing?.TeamId;
        var priority = routing?.DefaultPriority ?? 3;
        DateTime? slaPickupDeadline = null;

        if (teamId.HasValue)
        {
            var sla = await _slaConfigs.GetAsync(dto.TenantId, teamId, cancellationToken);
            slaPickupDeadline = now.AddMinutes(sla.PickupSlaMinutes);
        }

        await _tickets.CreateAsync(new TicketCreateModel
        {
            Id = id,
            TenantId = dto.TenantId,
            Title = dto.Subject,
            Description = dto.Description,
            Priority = priority,
            Status = TicketStatus.New,
            Source = "SELF_SERVICE",
            RequesterEmail = dto.RequesterEmail,
            RequesterName = dto.RequesterName,
            TeamId = teamId,
            CreatedBy = systemUserId,
            SlaPickupDeadline = slaPickupDeadline,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = dto.TenantId,
            TicketId = id,
            ActorId = systemUserId,
            EventType = HistoryEvent.Created,
            ToValue = TicketStatus.New,
            CreatedAt = now,
        }, cancellationToken);

        if (teamId.HasValue)
        {
            await _tickets.UpdateStatusAsync(dto.TenantId, id, new TicketStatusUpdate
            {
                Status = TicketStatus.TeamAssigned,
                TeamId = teamId,
                UpdatedAt = now,
            }, cancellationToken);

            await _history.WriteAsync(new HistoryEntry
            {
                TenantId = dto.TenantId,
                TicketId = id,
                ActorId = systemUserId,
                EventType = HistoryEvent.StatusChanged,
                FromValue = TicketStatus.New,
                ToValue = TicketStatus.TeamAssigned,
                CreatedAt = now,
            }, cancellationToken);
        }

        var ticketRef = BuildTicketRef(id);
        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "INTAKE_ACK",
            TicketId = id,
            TicketRef = ticketRef,
            TicketTitle = dto.Subject,
            RequesterEmail = dto.RequesterEmail,
            RequesterName = dto.RequesterName,
        });

        return (id, ticketRef);
    }

    public async Task ProcessInboundEmailAsync(
        string subject,
        string requesterEmail,
        string requesterName,
        string description,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _options.TriageTenantId
            ?? throw new InvalidOperationException("TRIAGE_TENANT_ID not configured");
        var teamId = _options.TriageTeamId
            ?? throw new InvalidOperationException("TRIAGE_TEAM_ID not configured");
        var systemUserId = _options.SystemUserId
            ?? throw new InvalidOperationException("INTAKE_SYSTEM_USER_ID not configured");

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        const string dedupSql = """
            SELECT TOP 1 id FROM dbo.Tickets
            WHERE tenant_id = @TenantId
              AND requester_email = @Email
              AND title = @Title
              AND source = 'EMAIL'
              AND created_at > DATEADD(MINUTE, -5, GETUTCDATE())
            """;
        var existing = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(
            dedupSql,
            new
            {
                TenantId = SqlGuid.ToSql(tenantId),
                Email = requesterEmail,
                Title = subject,
            },
            cancellationToken: cancellationToken));
        if (existing is not null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        await _tickets.CreateAsync(new TicketCreateModel
        {
            Id = id,
            TenantId = tenantId,
            Title = subject,
            Description = description,
            Priority = 3,
            Status = TicketStatus.TeamAssigned,
            Source = "EMAIL",
            RequesterEmail = requesterEmail,
            RequesterName = requesterName,
            TeamId = teamId,
            CreatedBy = systemUserId,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        await _history.WriteAsync(new HistoryEntry
        {
            TenantId = tenantId,
            TicketId = id,
            ActorId = systemUserId,
            EventType = HistoryEvent.Created,
            ToValue = TicketStatus.TeamAssigned,
            CreatedAt = now,
        }, cancellationToken);

        var ticketRef = BuildTicketRef(id);
        _notifications.EnqueueNotification(new NotificationPayload
        {
            Type = "INTAKE_ACK",
            TicketId = id,
            TicketRef = ticketRef,
            TicketTitle = subject,
            RequesterEmail = requesterEmail,
            RequesterName = requesterName,
        });

        _logger.LogInformation("Email ticket created: {TicketRef} from {Email}", ticketRef, requesterEmail);
    }

    private async Task EnsureSystemUserAsync(Guid tenantId, Guid systemUserId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Users WHERE id = @UserId AND tenant_id = @TenantId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql,
            new { UserId = SqlGuid.ToSql(systemUserId), TenantId = SqlGuid.ToSql(tenantId) },
            cancellationToken: cancellationToken));
        if (count == 0)
        {
            throw new BadRequestException("Ticket intake system user is misconfigured");
        }
    }

    private async Task<CategoryRoutingRow?> GetCategoryRoutingAsync(
        Guid tenantId,
        string category,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT team_id AS TeamId, default_priority AS DefaultPriority
            FROM dbo.CategoryRouting
            WHERE tenant_id = @TenantId AND category = @Category
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<RoutingDbRow>(new CommandDefinition(
            sql,
            new { TenantId = SqlGuid.ToSql(tenantId), Category = category },
            cancellationToken: cancellationToken));
        if (row is null || string.IsNullOrWhiteSpace(row.TeamId))
        {
            return null;
        }

        return new CategoryRoutingRow(SqlGuid.FromSql(row.TeamId), row.DefaultPriority);
    }

    private static string BuildTicketRef(Guid id)
    {
        var segment = id.ToString().Split('-')[0].ToUpperInvariant();
        return $"TKT-{segment}";
    }

    private sealed record CategoryRoutingRow(Guid TeamId, int DefaultPriority);

    private sealed class RoutingDbRow
    {
        public string TeamId { get; init; } = "";
        public int DefaultPriority { get; init; }
    }
}
