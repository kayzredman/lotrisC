namespace Lotris.Infrastructure.Analytics.Entities;

public class ReportJob
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string ReportType { get; set; } = string.Empty;

    public string Format { get; set; } = "PDF";

    public string Status { get; set; } = "QUEUED";

    public string? FilePath { get; set; }

    public Guid RequestedBy { get; set; }

    public string? DateFrom { get; set; }

    public string? DateTo { get; set; }

    public Guid? TeamId { get; set; }

    public string? ErrorMsg { get; set; }

    public string? InsightsJson { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }
}
