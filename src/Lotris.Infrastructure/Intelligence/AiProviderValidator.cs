using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Lotris.Application.Common;
using Lotris.Application.Intelligence;

namespace Lotris.Infrastructure.Intelligence;

public sealed class AiProviderValidator : IAiProviderValidator
{
    private readonly IHttpClientFactory _httpClientFactory;

    public AiProviderValidator(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

    public async Task ValidateAsync(string provider, string username, string password, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new BadRequestException("Password or API key is required.");
        }

        switch (provider.ToUpperInvariant())
        {
            case AiProviders.OpenAi:
            case AiProviders.ChatGpt:
                await ValidateOpenAiAsync(password, cancellationToken);
                break;
            case AiProviders.Claude:
                await ValidateClaudeAsync(password, cancellationToken);
                break;
            case AiProviders.Cursor:
                await ValidateCursorAsync(username, password, cancellationToken);
                break;
            default:
                throw new BadRequestException($"Provider {provider} does not support credential login.");
        }
    }

    private async Task ValidateOpenAiAsync(string apiKey, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.openai.com/v1/models");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
        using var res = await client.SendAsync(req, cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            throw new BadRequestException("OpenAI credentials were rejected. Use a valid API key (sk-…) as the password.");
        }
    }

    private async Task ValidateClaudeAsync(string apiKey, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        req.Headers.Add("x-api-key", apiKey.Trim());
        req.Headers.Add("anthropic-version", "2023-06-01");
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = "claude-3-5-haiku-20241022",
            max_tokens = 8,
            messages = new[] { new { role = "user", content = "ping" } },
        }), Encoding.UTF8, "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            throw new BadRequestException("Claude credentials were rejected. Use a valid Anthropic API key as the password.");
        }
    }

    private async Task ValidateCursorAsync(string username, string password, CancellationToken cancellationToken)
    {
        var apiKey = password.Trim();
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.cursor.com/v1/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        using var res = await client.SendAsync(req, cancellationToken);
        if (res.IsSuccessStatusCode)
        {
            return;
        }

        using var basicReq = new HttpRequestMessage(HttpMethod.Get, "https://api.cursor.com/teams/members");
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:"));
        basicReq.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
        using var basicRes = await client.SendAsync(basicReq, cancellationToken);
        if (basicRes.IsSuccessStatusCode)
        {
            return;
        }

        throw new BadRequestException(
            "Cursor credentials were rejected. Sign in with your Cursor email, and paste your Cursor API key (crsr_…) from cursor.com/dashboard → API Keys as the password.");
    }
}
