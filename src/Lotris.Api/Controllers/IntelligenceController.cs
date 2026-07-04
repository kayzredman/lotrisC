using Lotris.Api.Auth;
using Lotris.Application.Intelligence;
using Lotris.Contracts.Intelligence;
using Lotris.Domain;
using Lotris.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Lotris.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/admin/intelligence")]
public sealed class AdminIntelligenceController : ControllerBase
{
    public const string IntelligenceConnectFlow = "intelligence-connect";

    private readonly IntelligenceService _intelligence;
    private readonly EntraAuthOptions _entraOptions;
    private readonly IConfiguration _configuration;

    public AdminIntelligenceController(
        IntelligenceService intelligence,
        IOptions<EntraAuthOptions> entraOptions,
        IConfiguration configuration)
    {
        _intelligence = intelligence;
        _entraOptions = entraOptions.Value;
        _configuration = configuration;
    }

    [HttpGet]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
        => Ok(await _intelligence.GetConfigAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpGet("ai-providers")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IReadOnlyList<AiProviderOptionDto>), StatusCodes.Status200OK)]
    public IActionResult ListAiProviders()
        => Ok(_intelligence.ListAiProviders());

    [HttpPost("connect-provider")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(ConnectAiProviderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConnectProvider([FromBody] ConnectAiProviderRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.ConnectAiProviderAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpPost("test-connection")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(KnowledgeQueryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestConnection(CancellationToken cancellationToken)
        => Ok(await _intelligence.TestConnectionAsync(HttpContext.GetLotrisSession(), cancellationToken));

    [HttpPut]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromBody] UpdateIntelligenceConfigRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.UpdateConfigAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpPost("connect-entra")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConnectEntra([FromBody] ConnectEntraRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.ConnectEntraAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpGet("microsoft/login")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    public IActionResult MicrosoftLogin([FromQuery] string? returnUrl)
    {
        var safeReturnUrl = returnUrl ?? "/admin/intelligence";
        if (!_entraOptions.Enabled ||
            string.IsNullOrWhiteSpace(_entraOptions.ClientId) ||
            string.IsNullOrWhiteSpace(_entraOptions.ClientSecret) ||
            string.IsNullOrWhiteSpace(_entraOptions.TenantId))
        {
            return RedirectToWeb(safeReturnUrl, "error", "Microsoft sign-in is not configured on this server.");
        }

        var session = HttpContext.GetLotrisSession();
        var props = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(MicrosoftConnectComplete)) ?? "/api/v1/admin/intelligence/microsoft/complete",
            Items =
            {
                ["returnUrl"] = returnUrl ?? "/admin/intelligence",
                ["lotrisTenantId"] = session.TenantId.ToString(),
                ["lotrisUserId"] = session.UserId.ToString(),
                ["flow"] = IntelligenceConnectFlow,
            },
        };

        return Challenge(props, EntraAuthenticationExtensions.MicrosoftScheme);
    }

    [HttpGet("microsoft/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> MicrosoftConnectComplete(CancellationToken cancellationToken)
    {
        var authenticate = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!authenticate.Succeeded || authenticate.Principal is null)
        {
            return Unauthorized(new { message = "Microsoft authentication failed." });
        }

        if (authenticate.Properties?.Items.TryGetValue("flow", out var flow) != true ||
            flow != IntelligenceConnectFlow)
        {
            return BadRequest(new { message = "Invalid Microsoft connect flow." });
        }

        var entraTenantId = authenticate.Principal.FindFirstValue("tid")
            ?? authenticate.Principal.FindFirstValue("http://schemas.microsoft.com/identity/claims/tenantid");
        if (string.IsNullOrWhiteSpace(entraTenantId))
        {
            return BadRequest(new { message = "Microsoft did not return an Entra tenant ID." });
        }

        if (!authenticate.Properties.Items.TryGetValue("lotrisTenantId", out var lotrisTenantRaw) ||
            !Guid.TryParse(lotrisTenantRaw, out var lotrisTenantId) ||
            !authenticate.Properties.Items.TryGetValue("lotrisUserId", out var lotrisUserRaw) ||
            !Guid.TryParse(lotrisUserRaw, out var lotrisUserId))
        {
            return BadRequest(new { message = "Connect session expired. Try again from Intelligence settings." });
        }

        var returnUrl = authenticate.Properties.Items.TryGetValue("returnUrl", out var ru) && !string.IsNullOrWhiteSpace(ru)
            ? ru
            : "/admin/intelligence";

        await _intelligence.ConnectEntraForTenantAsync(lotrisTenantId, lotrisUserId, entraTenantId, cancellationToken);
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        var webUrl = (_configuration["App:WebUrl"] ?? _configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];

        var redirect = new UriBuilder(webUrl)
        {
            Path = returnUrl.StartsWith('/') ? returnUrl : $"/{returnUrl}",
            Query = "entra=connected",
        };

        return Redirect(redirect.Uri.ToString());
    }

    private IActionResult RedirectToWeb(string returnUrl, string entraStatus, string? message = null)
    {
        var webUrl = (_configuration["App:WebUrl"] ?? _configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];

        var query = $"entra={Uri.EscapeDataString(entraStatus)}";
        if (!string.IsNullOrWhiteSpace(message))
        {
            query += $"&message={Uri.EscapeDataString(message)}";
        }

        var redirect = new UriBuilder(webUrl)
        {
            Path = returnUrl.StartsWith('/') ? returnUrl.Split('?')[0] : $"/{returnUrl.Split('?')[0]}",
            Query = query,
        };

        return Redirect(redirect.Uri.ToString());
    }

    [HttpPost("connect-entra/dev")]
    [AuthorizeRoles(UserRole.SuperAdmin, UserRole.Admin, UserRole.ItManager)]
    [ProducesResponseType(typeof(IntelligenceConfigDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ConnectEntraDev(CancellationToken cancellationToken)
    {
        if (!HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
        {
            return NotFound();
        }

        var devTenantId = _configuration["Auth:Providers:Entra:DevTenantId"]
            ?? "00000000-0000-0000-0000-000000000001";
        var session = HttpContext.GetLotrisSession();
        return Ok(await _intelligence.ConnectEntraForTenantAsync(session.TenantId, session.UserId, devTenantId, cancellationToken));
    }
}

[ApiController]
[Authorize]
[Route("api/v1/intelligence")]
public sealed class IntelligenceController : ControllerBase
{
    private readonly IntelligenceService _intelligence;

    public IntelligenceController(IntelligenceService intelligence) => _intelligence = intelligence;

    [HttpPost("knowledge/query")]
    [ProducesResponseType(typeof(KnowledgeQueryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> QueryKnowledge([FromBody] KnowledgeQueryRequest request, CancellationToken cancellationToken)
        => Ok(await _intelligence.QueryAsync(HttpContext.GetLotrisSession(), request, cancellationToken));

    [HttpGet("knowledge/search")]
    [ProducesResponseType(typeof(IReadOnlyList<KnowledgeSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchKnowledge([FromQuery] string q, [FromQuery] int? topK, CancellationToken cancellationToken)
        => Ok(await _intelligence.SearchAsync(HttpContext.GetLotrisSession().TenantId, q, topK ?? 8, cancellationToken));
}
