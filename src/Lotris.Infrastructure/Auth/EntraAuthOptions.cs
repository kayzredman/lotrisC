namespace Lotris.Infrastructure.Auth;

public sealed class EntraAuthOptions
{
    public const string SectionName = "Auth:Providers:Entra";

    public bool Enabled { get; set; }

    public string TenantId { get; set; } = string.Empty;

    public string ClientId { get; set; } = string.Empty;

    public string ClientSecret { get; set; } = string.Empty;

    public Guid? DefaultTenantId { get; set; }

    public int DefaultRoleId { get; set; } = 5;

    public string CallbackPath { get; set; } = "/api/v1/auth/microsoft/callback";
}
