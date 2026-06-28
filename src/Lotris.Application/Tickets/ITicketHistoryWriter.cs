using Lotris.Application.Tickets;

namespace Lotris.Application.Tickets;

public interface ITicketHistoryWriter
{
    Task WriteAsync(HistoryEntry entry, CancellationToken cancellationToken = default);
}
