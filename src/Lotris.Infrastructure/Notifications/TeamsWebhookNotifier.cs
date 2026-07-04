using System.Net.Http.Json;
using System.Text.Json;
using Lotris.Application.Intelligence;
using Microsoft.Extensions.Logging;

namespace Lotris.Infrastructure.Notifications;

public interface ITeamsNotifier
{
    Task SendAsync(Guid tenantId, string title, string text, CancellationToken cancellationToken = default);
}

public sealed class TeamsWebhookNotifier : ITeamsNotifier
{
    private readonly IIntelligenceRepository _intelligence;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TeamsWebhookNotifier> _logger;

    public TeamsWebhookNotifier(
        IIntelligenceRepository intelligence,
        IHttpClientFactory httpClientFactory,
        ILogger<TeamsWebhookNotifier> logger)
    {
        _intelligence = intelligence;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(Guid tenantId, string title, string text, CancellationToken cancellationToken = default)
    {
        var config = await _intelligence.GetOrCreateConfigAsync(tenantId, cancellationToken);
        if (!config.TeamsEnabled || string.IsNullOrWhiteSpace(config.TeamsWebhookUrl))
        {
            return;
        }

        var webhook = config.TeamsWebhookUrl;
        var card = new
        {
            type = "message",
            attachments = new[]
            {
                new
                {
                    contentType = "application/vnd.microsoft.card.adaptive",
                    content = new
                    {
                        type = "AdaptiveCard",
                        version = "1.4",
                        body = new object[]
                        {
                            new { type = "TextBlock", text = title, weight = "Bolder", size = "Medium" },
                            new { type = "TextBlock", text, wrap = true },
                        },
                    },
                },
            },
        };

        try
        {
            var client = _httpClientFactory.CreateClient("teams-webhook");
            using var res = await client.PostAsJsonAsync(webhook, card, cancellationToken);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Teams webhook failed: {Status}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Teams webhook error");
        }
    }
}
