using Lotris.Api.Auth;
using Lotris.Api.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly SseConnectionManager _sse;

    public NotificationsController(SseConnectionManager sse)
    {
        _sse = sse;
    }

    [HttpGet("sse")]
    public async Task Sse(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        Response.Headers.CacheControl = "no-cache, no-transform";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        using var keepAliveCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = Task.Run(async () =>
        {
            while (!keepAliveCts.Token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), keepAliveCts.Token);
                    await Response.WriteAsync(": keep-alive\n\n", keepAliveCts.Token);
                    await Response.Body.FlushAsync(keepAliveCts.Token);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch
                {
                    break;
                }
            }
        }, CancellationToken.None);

        await _sse.AddConnectionAsync(session.UserId, Response, cancellationToken);
    }
}
