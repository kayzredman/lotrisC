using Lotris.Application.Queue;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Queue;

public sealed class RedisAutoAssignMutex : IAutoAssignMutex
{
    private static readonly TimeSpan MutexTtl = TimeSpan.FromSeconds(10);
    private readonly IConnectionMultiplexer _redis;

    public RedisAutoAssignMutex(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<IAsyncDisposable?> TryAcquireAsync(Guid ticketId, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var key = $"mutex:auto-assign:{ticketId}";
        var acquired = await db.StringSetAsync(key, "1", MutexTtl, When.NotExists);
        return acquired ? new MutexHandle(db, key) : null;
    }

    private sealed class MutexHandle(IDatabase db, RedisKey key) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => new(db.KeyDeleteAsync(key));
    }
}
