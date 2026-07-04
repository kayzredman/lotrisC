using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Lotris.Application.Intelligence;

namespace Lotris.Infrastructure.Intelligence;

public sealed class RoutedEmbeddingProvider : IEmbeddingProvider
{
    private readonly AzureOpenAIProviders _azure;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IApiKeyProtector _protector;

    public RoutedEmbeddingProvider(
        AzureOpenAIProviders azure,
        IHttpClientFactory httpClientFactory,
        IApiKeyProtector protector)
    {
        _azure = azure;
        _httpClientFactory = httpClientFactory;
        _protector = protector;
    }

    public async Task<float[]> EmbedAsync(string text, IntelligenceConfigEntity config, CancellationToken cancellationToken = default)
    {
        if (IsAzureReady(config))
        {
            return await _azure.EmbedAsync(text, config, cancellationToken);
        }

        if (AiProviders.UsesCredentialLogin(config.ProviderPath) && config.AiConnectedAt.HasValue)
        {
            var key = UnwrapCredential(config);
            return await EmbedOpenAiAsync(text, key, cancellationToken);
        }

        throw new InvalidOperationException("No embedding provider configured.");
    }

    private static bool IsAzureReady(IntelligenceConfigEntity config) =>
        (string.Equals(config.ProviderPath, AiProviders.Enterprise, StringComparison.OrdinalIgnoreCase) ||
         string.Equals(config.ProviderPath, AiProviders.Copilot, StringComparison.OrdinalIgnoreCase)) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiEndpoint) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey) &&
        (!string.IsNullOrWhiteSpace(config.AzureOpenaiDeploymentEmbed) ||
         !string.IsNullOrWhiteSpace(config.AzureOpenaiDeploymentChat));

    private string UnwrapCredential(IntelligenceConfigEntity config) =>
        _protector.Unprotect(config.AzureOpenaiApiKey!);

    private async Task<float[]> EmbedOpenAiAsync(string text, string apiKey, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("ai-provider");
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(
            JsonSerializer.Serialize(new { model = "text-embedding-3-small", input = text }),
            Encoding.UTF8,
            "application/json");

        using var res = await client.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        var arr = doc.RootElement.GetProperty("data")[0].GetProperty("embedding");
        var vec = new float[arr.GetArrayLength()];
        for (var i = 0; i < vec.Length; i++)
        {
            vec[i] = arr[i].GetSingle();
        }

        return vec;
    }
}
