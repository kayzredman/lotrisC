using Lotris.Application.Auth;
using Lotris.Application.Common;
using Lotris.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace Lotris.Infrastructure.Auth;

public sealed class IdentityUserAccountCreator : IUserAccountCreator
{
    private readonly UserManager<LotrisIdentityUser> _userManager;
    private readonly ILegacyUserProvisioner _legacyProvisioner;

    public IdentityUserAccountCreator(
        UserManager<LotrisIdentityUser> userManager,
        ILegacyUserProvisioner legacyProvisioner)
    {
        _userManager = userManager;
        _legacyProvisioner = legacyProvisioner;
    }

    public async Task<UserAccountCreateResult> CreateAsync(
        UserAccountCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new BadRequestException("A user with this email already exists.");
        }

        var userId = Guid.NewGuid();
        var user = new LotrisIdentityUser
        {
            Id = userId,
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            TenantId = request.TenantId,
            RoleId = request.RoleId,
            EmailConfirmed = true,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            throw new BadRequestException(string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        try
        {
            await _legacyProvisioner.ProvisionAsync(new LegacyUserProvisionRequest
            {
                UserId = userId,
                Email = request.Email,
                FullName = request.FullName,
                RoleId = request.RoleId,
                TenantId = request.TenantId,
                TeamId = request.TeamId,
            }, cancellationToken);
        }
        catch
        {
            await _userManager.DeleteAsync(user);
            throw;
        }

        return new UserAccountCreateResult { UserId = userId };
    }
}
