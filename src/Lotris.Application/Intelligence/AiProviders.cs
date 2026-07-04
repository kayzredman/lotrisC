namespace Lotris.Application.Intelligence;

public static class AiProviders
{
    public const string Disabled = "DISABLED";
    public const string Claude = "CLAUDE";
    public const string Cursor = "CURSOR";
    public const string ChatGpt = "CHATGPT";
    public const string Copilot = "COPILOT";
    public const string OpenAi = "OPENAI";
    public const string Enterprise = "ENTERPRISE";

    public static readonly string[] Selectable =
    [
        Claude,
        Cursor,
        ChatGpt,
        Copilot,
        OpenAi,
    ];

    public static bool IsValid(string? provider) =>
        provider is not null && Selectable.Contains(provider, StringComparer.OrdinalIgnoreCase);

    public static bool UsesMicrosoftOAuth(string? provider) =>
        string.Equals(provider, Copilot, StringComparison.OrdinalIgnoreCase);

    public static bool UsesCredentialLogin(string? provider) =>
        provider is not null && Selectable.Contains(provider, StringComparer.OrdinalIgnoreCase)
        && !UsesMicrosoftOAuth(provider);
}
