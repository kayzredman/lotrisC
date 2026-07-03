namespace Lotris.Infrastructure.Auth;

public class AuthOptions
{
    public const string SectionName = "Auth";

    public bool IdentityEnabled { get; set; } = true;

    public Guid? DefaultTenantId { get; set; }
}
