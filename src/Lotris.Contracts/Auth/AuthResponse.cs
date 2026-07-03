namespace Lotris.Contracts.Auth;

public record AuthResponse(string AccessToken, DateTime ExpiresAt, LotrisSession Session);
