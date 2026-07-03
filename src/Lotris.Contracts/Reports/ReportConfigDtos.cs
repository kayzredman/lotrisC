namespace Lotris.Contracts.Reports;

public sealed record ReportConfigDto(
    string BrandName,
    string DefaultTimezone,
    int AttachmentSizeLimitMb,
    int RetentionDays,
    IReadOnlyList<string> DefaultRecipients);

public sealed record UpdateReportConfigRequest
{
    public string? BrandName { get; init; }
    public string? DefaultTimezone { get; init; }
    public int? AttachmentSizeLimitMb { get; init; }
    public int? RetentionDays { get; init; }
    public IReadOnlyList<string>? DefaultRecipients { get; init; }
}
