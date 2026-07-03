using Lotris.Domain;

namespace Lotris.Contracts;

public record LotrisSession(Guid UserId, Guid TenantId, UserRole Role, string Email, string FullName);
