using System.Collections.Concurrent;
using Lotris.Application.Kpi;

namespace Lotris.Infrastructure.Kpi;

public sealed class KpiImportPendingStore : IKpiImportPendingStore
{
    private readonly ConcurrentDictionary<Guid, IReadOnlyList<KpiPendingImportRow>> _store = new();

    public void Set(Guid agreementId, IReadOnlyList<KpiPendingImportRow> rows) =>
        _store[agreementId] = rows;

    public IReadOnlyList<KpiPendingImportRow>? Get(Guid agreementId) =>
        _store.TryGetValue(agreementId, out var rows) ? rows : null;

    public void Remove(Guid agreementId) => _store.TryRemove(agreementId, out _);
}
