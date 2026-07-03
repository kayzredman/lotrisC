namespace Lotris.Infrastructure.Analytics.Entities;

public class ReportConfig
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string? BrandName { get; set; }

    public string? DefaultTimezone { get; set; }

    public int? AttachmentSizeLimitMb { get; set; }

    public int? RetentionDays { get; set; }

    public string? DefaultRecipients { get; set; }

    public DateTime UpdatedAt { get; set; }
}
