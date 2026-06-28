using Microsoft.AspNetCore.Identity;

namespace Lotris.Infrastructure.Identity;

public class LotrisIdentityUser : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public int RoleId { get; set; }
}
