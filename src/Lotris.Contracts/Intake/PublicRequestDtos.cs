namespace Lotris.Contracts.Intake;

public record CreatePublicRequest(
    Guid TenantId,
    string RequesterName,
    string RequesterEmail,
    string Category,
    string Subject,
    string Description);

public record CreatePublicRequestResponse(
    string TicketRef,
    string Message);

public static class WebFormCategories
{
    public static readonly IReadOnlyList<string> All =
    [
        "Hardware",
        "Software / Apps",
        "Access & Permissions",
        "Network / Connectivity",
        "Other",
    ];
}
