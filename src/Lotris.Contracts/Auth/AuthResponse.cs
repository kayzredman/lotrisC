namespace Lotris.Contracts.Auth;

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, LotrisSession Session);
