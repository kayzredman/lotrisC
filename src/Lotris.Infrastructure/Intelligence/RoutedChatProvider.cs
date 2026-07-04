using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Lotris.Application.Intelligence;

namespace Lotris.Infrastructure.Intelligence;

public sealed class RoutedChatProvider : IChatProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IApiKeyProtector _protector;
    private readonly AzureOpenAIProviders _azure;

    public RoutedChatProvider(
        IHttpClientFactory httpClientFactory,
        IApiKeyProtector protector,
        AzureOpenAIProviders azure)
    {
        _httpClientFactory = httpClientFactory;
        _protector = protector;
        _azure = azure;
    }

    public async Task<(string Content, int TokensIn, int TokensOut)> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        IntelligenceConfigEntity config,
        CancellationToken cancellationToken = default)
    {
        return config.ProviderPath.ToUpperInvariant() switch
        {
            AiProviders.Enterprise or AiProviders.Copilot when IsAzureReady(config)
                => await _azure.CompleteAsync(systemPrompt, userPrompt, config, cancellationToken),
            AiProviders.OpenAi or AiProviders.ChatGpt
                => await CompleteOpenAiAsync(systemPrompt, userPrompt, UnwrapCredential(config), "gpt-4o-mini", cancellationToken),
            AiProviders.Claude
                => await CompleteClaudeAsync(systemPrompt, userPrompt, UnwrapCredential(config), cancellationToken),
            AiProviders.Cursor
                => await CompleteCursorAsync(systemPrompt, userPrompt, UnwrapCredential(config), cancellationToken),
            _ => throw new InvalidOperationException("AI provider is not connected."),
        };
    }

    private static bool IsAzureReady(IntelligenceConfigEntity config) =>
        !string.IsNullOrWhiteSpace(config.AzureOpenaiEndpoint) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiDeploymentChat) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey);

    private string UnwrapCredential(IntelligenceConfigEntity config)
    {
        if (string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey))
        {
            throw new InvalidOperationException("AI credentials are not configured.");
        }

        return _protector.Unprotect(config.AzureOpenaiApiKey);
    }

    private async Task<(string Content, int TokensIn, int TokensOut)> CompleteOpenAiAsync(
        string systemPrompt,
        string userPrompt,
        string apiKey,
        string model,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model,
            temperature = 0.2,
            max_tokens = 1200,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt },
            },
        }), Encoding.UTF8, "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
        var usage = doc.RootElement.GetProperty("usage");
        return (content, usage.GetProperty("prompt_tokens").GetInt32(), usage.GetProperty("completion_tokens").GetInt32());
    }

    private async Task<(string Content, int TokensIn, int TokensOut)> CompleteClaudeAsync(
        string systemPrompt,
        string userPrompt,
        string apiKey,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        req.Headers.Add("x-api-key", apiKey);
        req.Headers.Add("anthropic-version", "2023-06-01");
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            model = "claude-3-5-haiku-20241022",
            max_tokens = 1200,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } },
        }), Encoding.UTF8, "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        var content = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
        var usage = doc.RootElement.GetProperty("usage");
        return (content, usage.GetProperty("input_tokens").GetInt32(), usage.GetProperty("output_tokens").GetInt32());
    }

    private async Task<(string Content, int TokensIn, int TokensOut)> CompleteCursorAsync(
        string systemPrompt,
        string userPrompt,
        string apiKey,
        CancellationToken cancellationToken)
    {
        if (apiKey.StartsWith("sk-", StringComparison.OrdinalIgnoreCase))
        {
            return await CompleteOpenAiAsync(systemPrompt, userPrompt, apiKey, "gpt-4o-mini", cancellationToken);
        }

        throw new InvalidOperationException(
            "Cursor API keys authenticate your account but do not support direct chat. Connect ChatGPT or OpenAI for copilot chat, or use an OpenAI key (sk-…) with the Cursor provider for testing.");
    }
}
