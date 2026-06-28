using Lotris.Application.Notifications;
using StackExchange.Redis;

namespace Lotris.Infrastructure.Notifications;

public sealed class RedisNotificationPublisher : INotificationPublisher
{
    private readonly IConnectionMultiplexer _redis;

    public RedisNotificationPublisher(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public Task PublishAsync(Guid userId, string jsonPayload, CancellationToken cancellationToken = default)
    {
        var subscriber = _redis.GetSubscriber();
        return subscriber.PublishAsync(RedisChannel.Literal($"sse:user:{userId}"), jsonPayload);
    }
}
