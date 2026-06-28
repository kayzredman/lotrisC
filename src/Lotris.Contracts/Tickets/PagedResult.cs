namespace Lotris.Contracts.Tickets;

public record PagedResult<T>(
    int Total,
    int Page,
    int Limit,
    IReadOnlyList<T> Rows);
