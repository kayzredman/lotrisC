using Lotris.Contracts.Intake;
using Lotris.Infrastructure.Intake;
using Microsoft.AspNetCore.Mvc;

namespace Lotris.Api.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class IntakeController : ControllerBase
{
    private readonly IntakeService _intake;

    public IntakeController(IntakeService intake)
    {
        _intake = intake;
    }

    [HttpPost("request")]
    [ProducesResponseType(typeof(CreatePublicRequestResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SubmitRequest(
        [FromBody] CreatePublicRequest request,
        CancellationToken cancellationToken)
    {
        var ip = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0]?.Trim()
            ?? HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";

        if (!await _intake.CheckRateLimitAsync(ip, cancellationToken))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { error = "Too many requests. Please try again later." });
        }

        if (!WebFormCategories.All.Contains(request.Category))
        {
            return BadRequest(new { message = $"Category must be one of: {string.Join(", ", WebFormCategories.All)}" });
        }

        var result = await _intake.CreateFromWebFormAsync(request, cancellationToken);
        return Created(string.Empty, new CreatePublicRequestResponse(
            result.TicketRef,
            $"Your request has been received ({result.TicketRef}). We will be in touch shortly."));
    }
}
