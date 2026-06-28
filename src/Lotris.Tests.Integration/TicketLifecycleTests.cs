using Lotris.Domain.Tickets;
using Xunit;

namespace Lotris.Tests.Integration;

public class TicketLifecycleTests
{
    [Theory]
    [InlineData(TicketStatus.New, TicketStatus.TeamAssigned, true)]
    [InlineData(TicketStatus.New, TicketStatus.Assigned, false)]
    [InlineData(TicketStatus.Assigned, TicketStatus.InProgress, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Resolved, true)]
    [InlineData(TicketStatus.InProgress, TicketStatus.Closed, false)]
    [InlineData(TicketStatus.Resolved, TicketStatus.Closed, true)]
    [InlineData(TicketStatus.Closed, TicketStatus.Resolved, false)]
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
