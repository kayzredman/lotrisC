using System.Net;
using System.Net.Http.Json;
using Lotris.Application.Tickets;
using Lotris.Contracts.Tickets;
using Lotris.Domain;
using Lotris.Domain.Tickets;
using Xunit;

namespace Lotris.Tests.Integration;

public class TenantIsolationIntegrationTests : IClassFixture<LotrisWebApplicationFactory>
{
    private readonly LotrisWebApplicationFactory _factory;

    public TenantIsolationIntegrationTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetTicket_OtherTenantTicket_Returns404()
    {
        var ticketId = Guid.NewGuid();
        _factory.SeedTicket(new TicketEntity
        {
            Id = ticketId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Tenant A ticket",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.Medium,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateOtherTenantClient();
        var response = await client.GetAsync($"/api/v1/tickets/{ticketId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PatchStatus_OtherTenantTicket_Returns404()
    {
        var ticketId = Guid.NewGuid();
        _factory.SeedTicket(new TicketEntity
        {
            Id = ticketId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Tenant A ticket",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.Medium,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateOtherTenantClient();
        var response = await client.PatchAsJsonAsync(
            $"/api/v1/tickets/{ticketId}/status",
            new UpdateTicketStatusRequest(TicketStatus.TeamAssigned, TeamId: Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListTickets_DoesNotIncludeOtherTenantRows()
    {
        var ownId = Guid.NewGuid();
        var otherId = Guid.NewGuid();

        _factory.SeedTicket(new TicketEntity
        {
            Id = ownId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Own tenant",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.Medium,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        _factory.SeedTicket(new TicketEntity
        {
            Id = otherId,
            TenantId = LotrisWebApplicationFactory.OtherTenantId,
            Title = "Other tenant",
            Description = "Desc",
            Status = TicketStatus.New,
            Priority = TicketPriority.Medium,
            CreatedBy = LotrisWebApplicationFactory.OtherUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateAuthenticatedClient();
        var response = await client.GetAsync("/api/v1/tickets?limit=50");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<PagedResult<TicketDto>>();
        Assert.NotNull(body);
        Assert.Contains(body.Rows, t => t.Id == ownId);
        Assert.DoesNotContain(body.Rows, t => t.Id == otherId);
    }

    [Fact]
    public async Task BatchReassign_OtherTenantTicket_MarksFailure()
    {
        var ticketId = Guid.NewGuid();
        _factory.SeedTicket(new TicketEntity
        {
            Id = ticketId,
            TenantId = LotrisWebApplicationFactory.TestTenantId,
            Title = "Tenant A ticket",
            Description = "Desc",
            Status = TicketStatus.Assigned,
            Priority = TicketPriority.Medium,
            AssigneeId = LotrisWebApplicationFactory.TestUserId,
            CreatedBy = LotrisWebApplicationFactory.TestUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        var client = _factory.CreateOtherTenantClient(UserRole.TeamLead);
        var response = await client.PostAsJsonAsync(
            "/api/v1/tickets/batch-reassign",
            new BatchReassignRequest(
            [
                new BatchReassignItem(ticketId, Guid.NewGuid()),
            ]));

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<BatchReassignResponse>();
        Assert.NotNull(body);
        Assert.Equal(0, body.Reassigned);
        Assert.Contains(body.Results, r => r.TicketId == ticketId && !r.Ok);
    }
}
