using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Lotris.Application.AuditLogs;
using Lotris.Application.Notifications;
using Lotris.Application.Reports;
using Lotris.Application.Tasks;
using Lotris.Application.Tickets;
using Lotris.Contracts.Tickets;
using Lotris.Domain;
using Lotris.Domain.Tickets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Lotris.Tests.Integration;

public class TicketLifecycleIntegrationTests : IClassFixture<LotrisWebApplicationFactory>
{
    private readonly LotrisWebApplicationFactory _factory;

    public TicketLifecycleIntegrationTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task PatchStatus_RejectsInvalidTransition()
    {
        var ticketId = Guid.NewGuid();
        _factory.SeedTicket(new TicketEntity
        {
            Id = ticketId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Test ticket",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.High,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateAuthenticatedClient();
        var response = await client.PatchAsJsonAsync(
            $"/api/v1/tickets/{ticketId}/status",
            new UpdateTicketStatusRequest(TicketStatus.Closed));

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(body);
        Assert.Contains("Invalid status transition", body.Message);
    }

    [Fact]
    public async Task PatchStatus_AllowsValidTransition()
    {
        var ticketId = Guid.NewGuid();
        _factory.SeedTicket(new TicketEntity
        {
            Id = ticketId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Test ticket",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.High,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateAuthenticatedClient();
        var response = await client.PatchAsJsonAsync(
            $"/api/v1/tickets/{ticketId}/status",
            new UpdateTicketStatusRequest(TicketStatus.TeamAssigned, TeamId: Guid.NewGuid()));

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        var ticket = await response.Content.ReadFromJsonAsync<TicketDto>();
        Assert.NotNull(ticket);
        Assert.Equal(TicketStatus.TeamAssigned, ticket.Status);
    }

    private sealed record ErrorResponse(string Message);
}

public sealed class LotrisWebApplicationFactory : WebApplicationFactory<Program>
{
    public static readonly Guid TestTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid TestUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private readonly InMemoryTicketRepository _tickets = new();
    private readonly InMemoryTaskRepository _tasks = new();
    private readonly InMemoryAuditLogRepository _auditLogs = new();
    private readonly InMemoryReportRepository _reports = new();

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<ITicketRepository>();
            services.RemoveAll<ITicketHistoryWriter>();
            services.RemoveAll<ISlaJobScheduler>();
            services.RemoveAll<INotificationEnqueuer>();
            services.RemoveAll<ITaskRepository>();
            services.RemoveAll<IAuditLogRepository>();
            services.RemoveAll<IReportRepository>();
            services.RemoveAll<IReportJobEnqueuer>();
            services.AddSingleton(_tickets);
            services.AddSingleton(_tasks);
            services.AddSingleton(_auditLogs);
            services.AddSingleton(_reports);
            services.AddScoped<ITicketRepository>(sp => sp.GetRequiredService<InMemoryTicketRepository>());
            services.AddScoped<ITaskRepository>(sp => sp.GetRequiredService<InMemoryTaskRepository>());
            services.AddScoped<IAuditLogRepository>(sp => sp.GetRequiredService<InMemoryAuditLogRepository>());
            services.AddScoped<IReportRepository>(sp => sp.GetRequiredService<InMemoryReportRepository>());
            services.AddSingleton<ITicketHistoryWriter, NoOpTicketHistoryWriter>();
            services.AddSingleton<ISlaJobScheduler, NoOpSlaJobScheduler>();
            services.AddSingleton<INotificationEnqueuer, NoOpNotificationEnqueuer>();
            services.AddSingleton<IReportJobEnqueuer, NoOpReportJobEnqueuer>();
        });
    }

    public void SeedTicket(TicketEntity ticket) => _tickets.Seed(ticket);

    public HttpClient CreateAuthenticatedClient(UserRole role = UserRole.Admin)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateTestToken(role));
        return client;
    }

    private static string CreateTestToken(UserRole role = UserRole.Admin)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("dev-only-change-me-use-at-least-32-characters-long-secret"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, TestUserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, "engineer@test.local"),
            new Claim("tenant_id", TestTenantId.ToString()),
            new Claim(ClaimTypes.Role, role.ToRoleName()),
            new Claim("full_name", "Test Admin"),
        };

        var token = new JwtSecurityToken(
            issuer: "lotris",
            audience: "lotris-api",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

internal sealed class InMemoryTicketRepository : ITicketRepository
{
    private readonly Dictionary<Guid, TicketEntity> _store = new();

    public void Seed(TicketEntity ticket) => _store[ticket.Id] = ticket;

    public Task CreateAsync(TicketCreateModel ticket, CancellationToken cancellationToken = default)
    {
        _store[ticket.Id] = new TicketEntity
        {
            Id = ticket.Id,
            TenantId = ticket.TenantId,
            Title = ticket.Title,
            Description = ticket.Description,
            Priority = ticket.Priority,
            Status = ticket.Status,
            TeamId = ticket.TeamId,
            CreatedBy = ticket.CreatedBy,
            Source = ticket.Source,
            RequesterEmail = ticket.RequesterEmail,
            RequesterName = ticket.RequesterName,
            SlaPickupDeadline = ticket.SlaPickupDeadline,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = ticket.UpdatedAt,
        };
        return Task.CompletedTask;
    }

    public Task<(IReadOnlyList<TicketEntity> Rows, int Total)> ListAsync(
        TicketListFilters filters,
        CancellationToken cancellationToken = default)
    {
        var rows = _store.Values.Where(t => t.TenantId == filters.TenantId).ToList();
        return Task.FromResult<(IReadOnlyList<TicketEntity>, int)>((rows, rows.Count));
    }

    public Task<TicketEntity?> GetByIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        _store.TryGetValue(ticketId, out var ticket);
        return Task.FromResult(ticket?.TenantId == tenantId ? ticket : null);
    }

    public Task UpdateStatusAsync(
        Guid tenantId,
        Guid ticketId,
        TicketStatusUpdate update,
        CancellationToken cancellationToken = default)
    {
        if (!_store.TryGetValue(ticketId, out var ticket) || ticket.TenantId != tenantId)
        {
            return Task.CompletedTask;
        }

        _store[ticketId] = new TicketEntity
        {
            Id = ticket.Id,
            TenantId = ticket.TenantId,
            Title = ticket.Title,
            Description = ticket.Description,
            Priority = ticket.Priority,
            Status = update.Status,
            TeamId = update.TeamId ?? ticket.TeamId,
            TeamName = ticket.TeamName,
            AssigneeId = update.AssigneeId ?? ticket.AssigneeId,
            CreatedBy = ticket.CreatedBy,
            Source = ticket.Source,
            RequesterEmail = ticket.RequesterEmail,
            RequesterName = ticket.RequesterName,
            RelatedTicketId = ticket.RelatedTicketId,
            SlaPickupDeadline = ticket.SlaPickupDeadline,
            SlaResolutionDeadline = update.SlaResolutionDeadline ?? ticket.SlaResolutionDeadline,
            SlaPickupBreached = ticket.SlaPickupBreached,
            SlaResolutionBreached = ticket.SlaResolutionBreached,
            SlaWarningLevel = ticket.SlaWarningLevel,
            AssignedAt = update.AssignedAt ?? ticket.AssignedAt,
            ResolvedAt = update.ResolvedAt ?? ticket.ResolvedAt,
            ClosedAt = update.ClosedAt ?? ticket.ClosedAt,
            CreatedAt = ticket.CreatedAt,
            UpdatedAt = update.UpdatedAt,
        };
        return Task.CompletedTask;
    }

    public Task ClaimAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default) =>
        UpdateStatusAsync(tenantId, ticketId, new TicketStatusUpdate
        {
            Status = TicketStatus.Assigned,
            AssigneeId = assigneeId,
            AssignedAt = assignedAt,
            SlaResolutionDeadline = resolutionDeadline,
            UpdatedAt = assignedAt,
        }, cancellationToken);

    public Task<int> CountOpenTicketsForAssigneeAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(0);

    public Task AutoAssignAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default) =>
        ClaimAsync(tenantId, ticketId, assigneeId, assignedAt, resolutionDeadline, cancellationToken);

    public Task MarkPickupSlaBreachedAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task MarkResolutionSlaBreachedAndEscalateAsync(
        Guid tenantId,
        Guid ticketId,
        string previousStatus,
        CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<Guid?>(null);

    public Task<IReadOnlyList<Guid>> GetGrantedTeamIdsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>([]);

    public Task<IReadOnlyList<Guid>> GetActiveEngineerIdsAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>([]);

    public Task<IReadOnlyDictionary<Guid, int>> GetEngineerWorkloadsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());

    public Task<Guid> AddCommentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid authorId,
        string body,
        bool isInternal,
        DateTime createdAt,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(Guid.NewGuid());

    public Task<IReadOnlyList<TicketCommentEntity>> GetCommentsAsync(
        Guid tenantId,
        Guid ticketId,
        bool excludeInternal,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<TicketCommentEntity>>([]);

    public Task<Guid> AddAttachmentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid uploadedBy,
        string storageKey,
        string originalName,
        string mimeType,
        long sizeBytes,
        DateTime createdAt,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(Guid.NewGuid());

    public Task<IReadOnlyList<TicketHistoryEntity>> GetHistoryAsync(
        Guid tenantId,
        Guid ticketId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<TicketHistoryEntity>>([]);

    public Task UpdateSlaWarningLevelAsync(
        Guid tenantId,
        Guid ticketId,
        string warningLevel,
        CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<IReadOnlyList<SlaWarningTicketEntity>> ListSlaWarningsAsync(
        Guid tenantId,
        Guid? engineerId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<SlaWarningTicketEntity>>([]);
}

internal sealed class NoOpSlaJobScheduler : ISlaJobScheduler
{
    public Task SchedulePickupSlaAsync(Guid ticketId, Guid tenantId, DateTime deadline, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task ScheduleResolutionSlaAsync(Guid ticketId, Guid tenantId, DateTime deadline, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task ScheduleAutoAssignAsync(Guid ticketId, Guid tenantId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}

internal sealed class NoOpTicketHistoryWriter : ITicketHistoryWriter
{
    public Task WriteAsync(HistoryEntry entry, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}

internal sealed class NoOpNotificationEnqueuer : INotificationEnqueuer
{
    public void EnqueueNotification(NotificationPayload payload)
    {
    }
}
