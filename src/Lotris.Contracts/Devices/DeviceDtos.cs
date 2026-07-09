namespace Lotris.Contracts.Devices;

public sealed record RegisterDeviceRequest(
    string Platform,
    string Token,
    string? DeviceLabel = null);

public sealed record DeviceTokenDto(
    Guid Id,
    string Platform,
    string? DeviceLabel,
    DateTime CreatedAt,
    DateTime UpdatedAt);
