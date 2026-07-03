using System.Collections.Concurrent;
using Lotris.Application.Queue;
using Lotris.Application.Tickets;
using Lotris.Contracts.Queue;
using Lotris.Domain.Tickets;
using Lotris.Infrastructure.Queue;
using Lotris.Workers.Jobs;
using StackExchange.Redis;
using Xunit;

namespace Lotris.Tests.Integration;

/// <summary>
/// Phase 7 gate: auto-assign mutex + SLA job behaviour under concurrent load.
/// </summary>
public class QueueEngineGateTests
{
    [Fact]
    public async Task AutoAssignJob_ConcurrentRuns_AssignsAtMostOnce()
    {
        var tenantId = Guid.NewGuid();
        var teamId = Guid.NewGuid();
        var ticketId = Guid.NewGuid();
        var engA = Guid.NewGuid();
        var engB = Guid.NewGuid();

        var tickets = new GateTicketRepository();
        tickets.Seed(new TicketEntity
        {
            Id = ticketId,
            TenantId = tenantId,
            TeamId = teamId,
            Title = "Queue ticket",
            Description = "Test",
            Status = TicketStatus.Unassigned,
            Priority = TicketPriority.Medium,
            CreatedBy = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        tickets.SetTeamEngineers(teamId, [engA, engB]);
        tickets.SetWorkload(engA, 3);
        tickets.SetWorkload(engB, 1);

        var queue = new GateQueueRepository(maxCapacity: 10, autoAssignEnabled: true);
        var history = new RecordingHistoryWriter();
        var scheduler = new RecordingSlaScheduler();
        var mutex = new InMemoryAutoAssignMutex();

        var job = new AutoAssignJob(tickets, queue, history, scheduler, mutex);

        var tasks = Enumerable.Range(0, 32)
            .Select(_ => job.ExecuteAsync(ticketId, tenantId))
            .ToArray();

        await Task.WhenAll(tasks);

        Assert.Equal(1, tickets.AutoAssignCount);
        Assert.Equal(TicketStatus.Assigned, tickets.GetStatus(ticketId));
        Assert.Equal(engB, tickets.GetAssignee(ticketId));
        Assert.Contains(history.Entries, e => e.EventType == HistoryEvent.AutoAssigned);
        Assert.Equal(1, scheduler.ResolutionSchedules);
    }

    [Fact]
    public async Task PickupSlaCheckJob_SchedulesAutoAssign_WhenStillUnassigned()
    {
        var tenantId = Guid.NewGuid();
        var ticketId = Guid.NewGuid();

        var tickets = new GateTicketRepository();
        tickets.Seed(new TicketEntity
        {
            Id = ticketId,
            TenantId = tenantId,
            TeamId = Guid.NewGuid(),
            Title = "SLA ticket",
            Description = "Test",
            Status = TicketStatus.TeamAssigned,
            Priority = TicketPriority.High,
            CreatedBy = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var scheduler = new RecordingSlaScheduler();
        var job = new PickupSlaCheckJob(tickets, new RecordingHistoryWriter(), scheduler);

        await job.ExecuteAsync(ticketId, tenantId);

        Assert.True(tickets.PickupSlaBreached(ticketId));
        Assert.Equal(1, scheduler.AutoAssignSchedules);
    }

    [Fact]
    public async Task ResolutionSlaCheckJob_EscalatesOpenTicket()
    {
        var tenantId = Guid.NewGuid();
        var ticketId = Guid.NewGuid();

        var tickets = new GateTicketRepository();
        tickets.Seed(new TicketEntity
        {
            Id = ticketId,
            TenantId = tenantId,
            TeamId = Guid.NewGuid(),
            Title = "Resolution SLA",
            Description = "Test",
            Status = TicketStatus.InProgress,
            Priority = TicketPriority.High,
            AssigneeId = Guid.NewGuid(),
            CreatedBy = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var history = new RecordingHistoryWriter();
        var job = new ResolutionSlaCheckJob(tickets, history);

        await job.ExecuteAsync(ticketId, tenantId);

        Assert.Equal(TicketStatus.Escalated, tickets.GetStatus(ticketId));
        Assert.Contains(history.Entries, e => e.EventType == HistoryEvent.ResolutionSlaBreached);
        Assert.Contains(history.Entries, e =>
            e.EventType == HistoryEvent.StatusChanged && e.ToValue == TicketStatus.Escalated);
    }

    [Fact]
    public async Task RedisMutex_ConcurrentAcquire_OnlyOneHolder()
    {
        IConnectionMultiplexer? redis = null;
        try
        {
            redis = await ConnectionMultiplexer.ConnectAsync("localhost:6379,connectTimeout=2000");
            if (!redis.IsConnected)
            {
                return;
            }
        }
        catch (RedisConnectionException)
        {
            return;
        }

        var ticketId = Guid.NewGuid();
        var mutex = new RedisAutoAssignMutex(redis);
        var acquired = 0;

        var tasks = Enumerable.Range(0, 24)
            .Select(async _ =>
            {
                await using var handle = await mutex.TryAcquireAsync(ticketId);
                if (handle is not null)
                {
                    Interlocked.Increment(ref acquired);
                    await Task.Delay(50);
                }
            })
            .ToArray();

        await Task.WhenAll(tasks);

        Assert.Equal(1, acquired);
    }
}

internal sealed class InMemoryAutoAssignMutex : IAutoAssignMutex
{
    private readonly ConcurrentDictionary<Guid, byte> _locks = new();

    public Task<IAsyncDisposable?> TryAcquireAsync(Guid ticketId, CancellationToken cancellationToken = default)
    {
        if (!_locks.TryAdd(ticketId, 0))
        {
            return Task.FromResult<IAsyncDisposable?>(null);
        }

        return Task.FromResult<IAsyncDisposable?>(new Handle(_locks, ticketId));
    }

    private sealed class Handle(ConcurrentDictionary<Guid, byte> locks, Guid ticketId) : IAsyncDisposable
    {
        public ValueTask DisposeAsync()
        {
            locks.TryRemove(ticketId, out _);
            return ValueTask.CompletedTask;
        }
    }
}

internal sealed class GateQueueRepository(int maxCapacity, bool autoAssignEnabled) : IQueueRepository
{
    public Task<QueueConfigEntity> GetConfigAsync(
        Guid tenantId,
        Guid? teamId = null,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(new QueueConfigEntity
        {
            MaxCapacityPerEngineer = maxCapacity,
            PickupSlaMinutes = 30,
            ResolutionSlaMinutes = 240,
            AutoAssignEnabled = autoAssignEnabled,
        });

    public Task<IReadOnlyList<QueueTicketEntity>> ListQueueAsync(
        Guid tenantId, Guid? teamId, int page, int limit, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<QueueHealthResponse> GetHealthAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task UpsertConfigAsync(QueueConfigUpsert upsert, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();
}

internal sealed class GateTicketRepository : ITicketRepository
{
    private readonly Dictionary<Guid, TicketEntity> _store = new();
    private readonly Dictionary<Guid, List<Guid>> _engineersByTeam = new();
    private readonly Dictionary<Guid, int> _workloads = new();
    private readonly HashSet<Guid> _pickupBreached = [];

    public int AutoAssignCount { get; private set; }

    public void Seed(TicketEntity ticket) => _store[ticket.Id] = ticket;

    public void SetTeamEngineers(Guid teamId, IReadOnlyList<Guid> engineerIds) =>
        _engineersByTeam[teamId] = engineerIds.ToList();

    public void SetWorkload(Guid engineerId, int openCount) => _workloads[engineerId] = openCount;

    public string GetStatus(Guid ticketId) => _store[ticketId].Status;

    public Guid? GetAssignee(Guid ticketId) => _store[ticketId].AssigneeId;

    public bool PickupSlaBreached(Guid ticketId) => _pickupBreached.Contains(ticketId);

    public Task<TicketEntity?> GetByIdAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        if (!_store.TryGetValue(ticketId, out var ticket) || ticket.TenantId != tenantId)
        {
            return Task.FromResult<TicketEntity?>(null);
        }

        return Task.FromResult<TicketEntity?>(ticket);
    }

    public Task AutoAssignAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default)
    {
        AutoAssignCount++;
        var ticket = _store[ticketId];
        _store[ticketId] = CopyTicket(ticket, TicketStatus.Assigned, assigneeId, assignedAt, resolutionDeadline);
        return Task.CompletedTask;
    }

    public Task MarkPickupSlaBreachedAsync(Guid tenantId, Guid ticketId, CancellationToken cancellationToken = default)
    {
        _pickupBreached.Add(ticketId);
        return Task.CompletedTask;
    }

    public Task MarkResolutionSlaBreachedAndEscalateAsync(
        Guid tenantId,
        Guid ticketId,
        string previousStatus,
        CancellationToken cancellationToken = default)
    {
        var ticket = _store[ticketId];
        _store[ticketId] = CopyTicket(ticket, TicketStatus.Escalated, ticket.AssigneeId, ticket.AssignedAt, ticket.SlaResolutionDeadline);
        return Task.CompletedTask;
    }

    private static TicketEntity CopyTicket(
        TicketEntity source,
        string status,
        Guid? assigneeId,
        DateTime? assignedAt,
        DateTime? resolutionDeadline) =>
        new()
        {
            Id = source.Id,
            TenantId = source.TenantId,
            Title = source.Title,
            Description = source.Description,
            Priority = source.Priority,
            Status = status,
            TeamId = source.TeamId,
            TeamName = source.TeamName,
            AssigneeId = assigneeId,
            CreatedBy = source.CreatedBy,
            Source = source.Source,
            RequesterEmail = source.RequesterEmail,
            RequesterName = source.RequesterName,
            RelatedTicketId = source.RelatedTicketId,
            SlaPickupDeadline = source.SlaPickupDeadline,
            SlaResolutionDeadline = resolutionDeadline,
            SlaPickupBreached = source.SlaPickupBreached,
            SlaResolutionBreached = source.SlaResolutionBreached,
            SlaWarningLevel = source.SlaWarningLevel,
            AssignedAt = assignedAt,
            ResolvedAt = source.ResolvedAt,
            ClosedAt = source.ClosedAt,
            CreatedAt = source.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

    public Task<IReadOnlyList<Guid>> GetActiveEngineerIdsAsync(
        Guid tenantId,
        Guid teamId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Guid>>(_engineersByTeam.GetValueOrDefault(teamId, []));

    public Task<IReadOnlyDictionary<Guid, int>> GetEngineerWorkloadsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyDictionary<Guid, int>>(_workloads);

    public Task CreateAsync(TicketCreateModel ticket, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<(IReadOnlyList<TicketEntity> Rows, int Total)> ListAsync(
        TicketListFilters filters,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task UpdateStatusAsync(
        Guid tenantId,
        Guid ticketId,
        TicketStatusUpdate update,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task ClaimAsync(
        Guid tenantId,
        Guid ticketId,
        Guid assigneeId,
        DateTime assignedAt,
        DateTime resolutionDeadline,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<int> CountOpenTicketsForAssigneeAsync(
        Guid tenantId,
        Guid assigneeId,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<Guid?> GetUserTeamIdAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<Guid>> GetGrantedTeamIdsAsync(
        Guid tenantId,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<Guid> AddCommentAsync(
        Guid tenantId,
        Guid ticketId,
        Guid authorId,
        string body,
        bool isInternal,
        DateTime createdAt,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<TicketCommentEntity>> GetCommentsAsync(
        Guid tenantId,
        Guid ticketId,
        bool excludeInternal,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

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
        throw new NotImplementedException();

    public Task<IReadOnlyList<TicketHistoryEntity>> GetHistoryAsync(
        Guid tenantId,
        Guid ticketId,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task UpdateSlaWarningLevelAsync(
        Guid tenantId,
        Guid ticketId,
        string warningLevel,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<IReadOnlyList<SlaWarningTicketEntity>> ListSlaWarningsAsync(
        Guid tenantId,
        Guid? engineerId,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task<bool> ReassignAssigneeAsync(
        Guid tenantId,
        Guid ticketId,
        Guid toEngineerId,
        DateTime now,
        CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();
}

internal sealed class RecordingHistoryWriter : ITicketHistoryWriter
{
    public List<HistoryEntry> Entries { get; } = [];

    public Task WriteAsync(HistoryEntry entry, CancellationToken cancellationToken = default)
    {
        Entries.Add(entry);
        return Task.CompletedTask;
    }
}

internal sealed class RecordingSlaScheduler : ISlaJobScheduler
{
    public int AutoAssignSchedules { get; private set; }
    public int ResolutionSchedules { get; private set; }

    public Task SchedulePickupSlaAsync(
        Guid ticketId,
        Guid tenantId,
        DateTime deadline,
        CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task ScheduleResolutionSlaAsync(
        Guid ticketId,
        Guid tenantId,
        DateTime deadline,
        CancellationToken cancellationToken = default)
    {
        ResolutionSchedules++;
        return Task.CompletedTask;
    }

    public Task ScheduleAutoAssignAsync(
        Guid ticketId,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        AutoAssignSchedules++;
        return Task.CompletedTask;
    }
}
