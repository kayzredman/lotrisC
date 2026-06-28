namespace Lotris.Application.Admin;

public interface IAdminRepository
{
    Task<IReadOnlyList<AdminUserEntity>> ListUsersAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<AdminUserEntity?> GetUserAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);

    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);

    Task UpdateUserAsync(
        Guid tenantId,
        Guid userId,
        AdminUserUpdateModel update,
        CancellationToken cancellationToken = default);

    Task DeactivateUserAsync(Guid tenantId, Guid userId, DateTime updatedAt, CancellationToken cancellationToken = default);

    Task AssignRoleAsync(
        Guid tenantId,
        Guid userId,
        int roleId,
        DateTime updatedAt,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminTeamEntity>> ListTeamsAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task CreateTeamAsync(AdminTeamCreateModel team, CancellationToken cancellationToken = default);

    Task<AdminTeamEntity?> GetTeamAsync(Guid tenantId, Guid teamId, CancellationToken cancellationToken = default);

    Task UpdateTeamAsync(
        Guid tenantId,
        Guid teamId,
        AdminTeamUpdateModel update,
        CancellationToken cancellationToken = default);
}
