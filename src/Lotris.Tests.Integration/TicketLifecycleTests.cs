using Lotris.Domain.Tickets;
using Xunit;

namespace Lotris.Tests.Integration;

public class TicketLifecycleTests
{
    [Theory]
    [InlineData(TicketStatus.New, TicketStatus.TeamAssigned, true)]
    [InlineData(TicketStatus.New, TicketStatus.Assigned, false)]
    [InlineData(TicketStatus.TeamAssigned, TicketStatus.Unassigned, true)]
    [InlineData(TicketStatus.TeamAssigned, TicketStatus.Assigned, false)]
    [InlineData(TicketStatus.Unassigned, TicketStatus.Assigned, true)]
    [InlineData(TicketStatus.Assigned, TicketStatus.InProgress, true)]
    [InlineData(TicketStatus.Assigned, TicketStatus.Resolved, false)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Escalated, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Closed, false)]
    [InlineData(TicketStatus.Escalated, TicketStatus.InProgress, true)]
    [InlineData(TicketStatus.Escalated, TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.Resolved, TicketStatus.Closed, true)]
    [InlineData(TicketStatus.Closed, TicketStatus.Resolved, false)]
    [InlineData(TicketStatus.Closed, TicketStatus.New, false)]
    public void IsTransitionAllowed_MatchesFsm(string from, string to, bool expected)
    {
        Assert.Equal(expected, TicketLifecycle.IsTransitionAllowed(from, to));
    }

    [Fact]
    public void AssertTransition_ThrowsForInvalidTransition()
    {
        var ex = Assert.Throws<InvalidOperationException>(() =>
            TicketLifecycle.AssertTransition(TicketStatus.New, TicketStatus.Closed));

        Assert.Contains("NEW → CLOSED", ex.Message);
    }
}
