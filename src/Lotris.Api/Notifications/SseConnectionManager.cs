using System.Collections.Concurrent;
using System.Text;
using StackExchange.Redis;

namespace Lotris.Api.Notifications;

public sealed class SseConnectionManager : IAsyncDisposable
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ConcurrentDictionary<Guid, HashSet<SseStream>> _connections = new();
    private ISubscriber? _subscriber;

    public SseConnectionManager(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task AddConnectionAsync(Guid userId, HttpResponse response, CancellationToken cancellationToken)
    {
        response.Headers.CacheControl = "no-cache, no-transform";
        response.Headers.Connection = "keep-alive";
        response.Headers["X-Accel-Buffering"] = "no";
        response.ContentType = "text/event-stream";
        await response.StartAsync(cancellationToken);

        var stream = new SseStream(response);
        var isNew = false;

        _connections.AddOrUpdate(
            userId,
            _ =>
            {
                isNew = true;
                return [stream];
            },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.Add(stream);
                }

                return existing;
            });

        if (isNew)
        {
            _subscriber ??= _redis.GetSubscriber();
            await _subscriber.SubscribeAsync(RedisChannel.Literal($"sse:user:{userId}"), (_, message) =>
            {
                FanOut(userId, message!);
            });
        }

        try
        {
            await stream.WaitForCloseAsync(cancellationToken);
        }
        finally
        {
            RemoveConnection(userId, stream);
        }
    }

    private void FanOut(Guid userId, string message)
    {
        if (!_connections.TryGetValue(userId, out var connections))
        {
            return;
        }

        lock (connections)
        {
            foreach (var connection in connections.ToArray())
            {
                if (!connection.TryWrite(message))
                {
                    connections.Remove(connection);
                }
            }

            if (connections.Count == 0)
            {
                _connections.TryRemove(userId, out _);
            }
        }
    }

    private void RemoveConnection(Guid userId, SseStream stream)
    {
        if (!_connections.TryGetValue(userId, out var connections))
        {
            return;
        }

        lock (connections)
        {
            connections.Remove(stream);
            if (connections.Count == 0)
            {
                _connections.TryRemove(userId, out _);
            }
        }
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private sealed class SseStream
    {
        private readonly HttpResponse _response;
        private readonly SemaphoreSlim _writeLock = new(1, 1);

        public SseStream(HttpResponse response)
        {
            _response = response;
        }

        public bool TryWrite(string message)
        {
            try
            {
                _writeLock.Wait();
                var payload = $"data: {message}\n\n";
                _response.Body.Write(Encoding.UTF8.GetBytes(payload));
                _response.Body.Flush();
                return true;
            }
            catch
            {
                return false;
            }
            finally
            {
                if (_writeLock.CurrentCount == 0)
                {
                    _writeLock.Release();
                }
            }
        }

        public async Task WaitForCloseAsync(CancellationToken cancellationToken)
        {
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken,
                _response.HttpContext.RequestAborted);

            try
            {
                await Task.Delay(Timeout.Infinite, linked.Token);
            }
            catch (OperationCanceledException)
            {
            }
        }
    }
}
