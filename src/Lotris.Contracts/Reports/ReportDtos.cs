namespace Lotris.Contracts.Reports;

public record GenerateReportRequest(
    string ReportType,
    string Format,
    string? DateFrom,
    string? DateTo,
    Guid? TeamId);

public record GenerateReportResponse(Guid JobId);

public record ReportJobDto(
    Guid Id,
    Guid TenantId,
    string ReportType,
    string Format,
    string Status,
    string? FilePath,
    Guid RequestedBy,
    string? DateFrom,
    string? DateTo,
    Guid? TeamId,
    string? ErrorMsg,
    DateTime CreatedAt,
    DateTime? CompletedAt);

public record CreateReportScheduleRequest(
    string ReportType,
    string Format,
    string Frequency,
    string Recipients,
    Guid? TeamId);

public record CreateReportScheduleResponse(Guid Id);

public record ReportScheduleDto(
    Guid Id,
    Guid TenantId,
    string ReportType,
    string Format,
    string Frequency,
    string Recipients,
    Guid? TeamId,
    bool IsActive,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime? NextRunAt,
    DateTime? LastRunAt);
