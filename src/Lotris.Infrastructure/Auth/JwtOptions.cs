namespace Lotris.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "lotris";

    public string Audience { get; set; } = "lotris-api";

    public int ExpirationMinutes { get; set; } = 480;

    public int RefreshExpirationDays { get; set; } = 30;
}
