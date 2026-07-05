using Lotris.Api.Auth;
using Lotris.Application.Notifications;
using Lotris.Contracts.Devices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/devices")]
public sealed class DevicesController : ControllerBase
{
    private readonly IDeviceTokenRepository _devices;

    public DevicesController(IDeviceTokenRepository devices)
    {
        _devices = devices;
    }

    /// <summary>Register Expo / FCM / APNs token for pager push.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(DeviceTokenDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDeviceRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Platform))
        {
            return BadRequest(new { message = "Platform and token are required." });
        }

        var session = HttpContext.GetLotrisSession();
        var record = await _devices.UpsertAsync(
            session.UserId,
            session.TenantId,
            request.Platform.Trim().ToLowerInvariant(),
            request.Token.Trim(),
            request.DeviceLabel,
            cancellationToken);

        return Ok(new DeviceTokenDto(
            record.Id,
            record.Platform,
            record.DeviceLabel,
            record.CreatedAt,
            record.UpdatedAt));
    }

    /// <summary>Revoke a device token (logout / lost device).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var ok = await _devices.RevokeAsync(id, session.UserId, cancellationToken);
        return ok ? NoContent() : NotFound(new { message = "Device not found." });
    }

    /// <summary>List active devices for current user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<DeviceTokenDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var session = HttpContext.GetLotrisSession();
        var rows = await _devices.ListActiveForUserAsync(session.UserId, cancellationToken);
        return Ok(rows.Select(r => new DeviceTokenDto(
            r.Id,
            r.Platform,
            r.DeviceLabel,
            r.CreatedAt,
            r.UpdatedAt)).ToList());
    }
}
