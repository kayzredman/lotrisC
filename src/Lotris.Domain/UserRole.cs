namespace Lotris.Domain;

/// <summary>
/// Maps to MSSQL Roles.id (seed order in 0001_initial_schema.sql).
/// </summary>
public enum UserRole
{
    SuperAdmin = 1,
    Admin = 2,
    ItManager = 3,
    TeamLead = 4,
    Engineer = 5,
    Executive = 6,
}

public static class UserRoleExtensions
{
    public static string ToRoleName(this UserRole role) => role switch
    {
        UserRole.SuperAdmin => "SUPERADMIN",
        UserRole.Admin => "ADMIN",
        UserRole.ItManager => "IT_MANAGER",
        UserRole.TeamLead => "TEAM_LEAD",
        UserRole.Engineer => "ENGINEER",
        UserRole.Executive => "EXECUTIVE",
        _ => role.ToString().ToUpperInvariant(),
    };

    public static UserRole FromRoleName(string roleName) => roleName.ToUpperInvariant() switch
    {
        "SUPERADMIN" => UserRole.SuperAdmin,
        "ADMIN" => UserRole.Admin,
        "IT_MANAGER" => UserRole.ItManager,
        "TEAM_LEAD" => UserRole.TeamLead,
        "ENGINEER" => UserRole.Engineer,
        "EXECUTIVE" => UserRole.Executive,
        _ => Enum.Parse<UserRole>(roleName, ignoreCase: true),
    };
}
