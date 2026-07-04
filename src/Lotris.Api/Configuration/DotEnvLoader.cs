namespace Lotris.Api.Configuration;

/// <summary>
/// Loads repo-root .env into process environment for local development.
/// ASP.NET Core maps ENTRA_* aliases to Auth:Providers:Entra automatically.
/// </summary>
public static class DotEnvLoader
{
    private static readonly (string EnvKey, string ConfigKey)[] EntraAliases =
    [
        ("ENTRA_ENABLED", "Auth__Providers__Entra__Enabled"),
        ("ENTRA_TENANT_ID", "Auth__Providers__Entra__TenantId"),
        ("ENTRA_CLIENT_ID", "Auth__Providers__Entra__ClientId"),
        ("ENTRA_CLIENT_SECRET", "Auth__Providers__Entra__ClientSecret"),
        ("ENTRA_DEFAULT_TENANT_ID", "Auth__Providers__Entra__DefaultTenantId"),
    ];

    public static void LoadForDevelopment()
    {
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? "Development";
        if (env.Equals("Production", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        foreach (var path in ResolveCandidatePaths())
        {
            if (!File.Exists(path))
            {
                continue;
            }

            ApplyFile(path);
            ApplyEntraAliases();
            return;
        }
    }

    private static IEnumerable<string> ResolveCandidatePaths()
    {
        var cwd = Directory.GetCurrentDirectory();
        yield return Path.Combine(cwd, ".env");
        yield return Path.Combine(cwd, "..", ".env");
        yield return Path.Combine(cwd, "..", "..", ".env");
        yield return Path.Combine(cwd, "..", "..", "..", ".env");
    }

    private static void ApplyFile(string path)
    {
        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            var idx = line.IndexOf('=');
            if (idx <= 0)
            {
                continue;
            }

            var key = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim().Trim('"');
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            if (Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    private static void ApplyEntraAliases()
    {
        foreach (var (envKey, configKey) in EntraAliases)
        {
            var value = Environment.GetEnvironmentVariable(envKey);
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (Environment.GetEnvironmentVariable(configKey) is null)
            {
                Environment.SetEnvironmentVariable(configKey, value);
            }
        }
    }
}
