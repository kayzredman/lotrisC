using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Lotris.Application.Intelligence;

namespace Lotris.Infrastructure.Intelligence;

public sealed class AzureOpenAIProviders : IEmbeddingProvider, IChatProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IApiKeyProtector _protector;

    public AzureOpenAIProviders(IHttpClientFactory httpClientFactory, IApiKeyProtector protector)
    {
        _httpClientFactory = httpClientFactory;
        _protector = protector;
    }

    public async Task<float[]> EmbedAsync(string text, IntelligenceConfigEntity config, CancellationToken cancellationToken = default)
    {
        var apiKey = UnwrapKey(config);
        var deployment = config.AzureOpenaiDeploymentEmbed ?? config.AzureOpenaiDeploymentChat!;
        var url = $"{config.AzureOpenaiEndpoint}/openai/deployments/{deployment}/embeddings?api-version=2024-06-01";
        var client = _httpClientFactory.CreateClient("azure-openai");
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(
            JsonSerializer.Serialize(new { input = text }),
            Encoding.UTF8,
            "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        var arr = doc.RootElement.GetProperty("data")[0].GetProperty("embedding");
        var vec = new float[arr.GetArrayLength()];
        for (var i = 0; i < vec.Length; i++) vec[i] = arr[i].GetSingle();
        return vec;
    }

    public async Task<(string Content, int TokensIn, int TokensOut)> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        IntelligenceConfigEntity config,
        CancellationToken cancellationToken = default)
    {
        var apiKey = UnwrapKey(config);
        var deployment = config.AzureOpenaiDeploymentChat!;
        var url = $"{config.AzureOpenaiEndpoint}/openai/deployments/{deployment}/chat/completions?api-version=2024-06-01";
        var client = _httpClientFactory.CreateClient("azure-openai");
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(new
        {
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt },
            },
            temperature = 0.2,
            max_tokens = 1200,
        }), Encoding.UTF8, "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(body);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
        var usage = doc.RootElement.GetProperty("usage");
        var tokensIn = usage.GetProperty("prompt_tokens").GetInt32();
        var tokensOut = usage.GetProperty("completion_tokens").GetInt32();
        return (content, tokensIn, tokensOut);
    }

    private string UnwrapKey(IntelligenceConfigEntity config)
    {
        if (string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey))
        {
            throw new InvalidOperationException("Azure OpenAI API key is not configured.");
        }

        return _protector.Unprotect(config.AzureOpenaiApiKey);
    }
}

/// <summary>Dev/on-prem protector — stores API keys obfuscated at rest. Replace with vault in production.</summary>
public sealed class SimpleApiKeyProtector : IApiKeyProtector
{
    public string Protect(string plainText) => Convert.ToBase64String(Encoding.UTF8.GetBytes(plainText));
    public string Unprotect(string protectedText) => Encoding.UTF8.GetString(Convert.FromBase64String(protectedText));
}
