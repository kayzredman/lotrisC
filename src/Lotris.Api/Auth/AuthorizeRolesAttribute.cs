using Lotris.Domain;

namespace Lotris.Api.Auth;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class AuthorizeRolesAttribute : Microsoft.AspNetCore.Authorization.AuthorizeAttribute
{
    public AuthorizeRolesAttribute(params UserRole[] roles)
    {
        Roles = string.Join(",", roles.Select(r => r.ToRoleName()));
    }
}
