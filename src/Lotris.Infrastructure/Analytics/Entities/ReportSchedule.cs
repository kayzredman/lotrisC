namespace Lotris.Infrastructure.Analytics.Entities;

public class ReportSchedule
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string ReportType { get; set; } = string.Empty;

    public string Format { get; set; } = "PDF";

    public string Frequency { get; set; } = string.Empty;

    public string Recipients { get; set; } = "[]";

    public Guid? TeamId { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? NextRunAt { get; set; }

    public DateTime? LastRunAt { get; set; }
}
