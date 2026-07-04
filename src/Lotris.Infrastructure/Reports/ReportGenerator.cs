using System.Text.Json;
using ClosedXML.Excel;
using Lotris.Application.Intelligence;
using Lotris.Application.Reports;
using Lotris.Contracts.Intelligence;
using Lotris.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Lotris.Infrastructure.Reports;

public sealed class ReportGenerator : IReportGenerator
{
    static ReportGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    private readonly LotrisDbContext _db;
    private readonly IntelligenceService _intelligence;

    public ReportGenerator(LotrisDbContext db, IntelligenceService intelligence)
    {
        _db = db;
        _intelligence = intelligence;
    }

    public async Task<ReportGenerationResult> GenerateAsync(
        Guid tenantId,
        string reportType,
        string format,
        string? dateFrom,
        string? dateTo,
        Guid? teamId,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);
        var extension = format == "EXCEL" ? ".xlsx" : ".pdf";
        var filePath = Path.Combine(outputDirectory, $"lotris-report-{Guid.NewGuid():N}{extension}");
        var content = await BuildReportContentAsync(tenantId, reportType, dateFrom, dateTo, cancellationToken);
        var snapshotJson = JsonSerializer.Serialize(new
        {
            reportType,
            dateFrom,
            dateTo,
            lines = content.Lines,
            headers = content.Headers,
            rowCount = content.TableRows.Count,
        });
        var narrative = await _intelligence.TryGenerateReportNarrativeAsync(
            tenantId, reportType, snapshotJson, cancellationToken);
        var insightsJson = narrative is null
            ? null
            : JsonSerializer.Serialize(narrative);

        if (format == "EXCEL")
        {
            await GenerateExcelAsync(content, narrative, filePath, cancellationToken);
        }
        else
        {
            await GeneratePdfAsync(reportType, content, narrative, filePath, cancellationToken);
        }

        return new ReportGenerationResult(filePath, insightsJson);
    }

    private async Task GeneratePdfAsync(
        string reportType,
        ReportContent content,
        ReportNarrativeDto? narrative,
        string filePath,
        CancellationToken cancellationToken)
    {
        var label = LabelFor(reportType);

        await Task.Run(() =>
        {
            Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(50);
                    page.Size(PageSizes.A4);
                    page.Header().Column(col =>
                    {
                        col.Item().Text("Lotris — IT Help Desk Report").FontSize(20).Bold();
                        col.Item().Text(label).FontSize(14);
                        col.Item().Text($"Generated: {DateTime.UtcNow:R}").FontSize(10).FontColor(Colors.Grey.Medium);
                    });
                    page.Content().PaddingVertical(20).Column(col =>
                    {
                        if (narrative is not null)
                        {
                            col.Item().PaddingBottom(12).Column(insightCol =>
                            {
                                insightCol.Item().Text("Executive Insights").FontSize(14).Bold().FontColor(Colors.Indigo.Darken2);
                                insightCol.Item().PaddingTop(6).Text(narrative.Summary).FontSize(10).LineHeight(1.4f);
                                if (!string.IsNullOrWhiteSpace(narrative.Recommendations))
                                {
                                    insightCol.Item().PaddingTop(8).Text("Recommendations").FontSize(11).Bold();
                                    insightCol.Item().Text(narrative.Recommendations).FontSize(10).LineHeight(1.4f);
                                }
                            });
                            col.Item().PaddingVertical(8).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                        }

                        foreach (var line in content.Lines)
                        {
                            col.Item().Text(line).FontSize(line.StartsWith("Period:", StringComparison.Ordinal) ? 12 : 10);
                        }
                    });
                });
            }).GeneratePdf(filePath);
        }, cancellationToken);
    }

    private async Task GenerateExcelAsync(
        ReportContent content,
        ReportNarrativeDto? narrative,
        string filePath,
        CancellationToken cancellationToken)
    {
        await Task.Run(() =>
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.Worksheets.Add("Report");
            var rowIndex = 1;

            if (narrative is not null)
            {
                sheet.Cell(rowIndex++, 1).Value = "Executive Insights";
                sheet.Cell(rowIndex++, 1).Value = narrative.Summary;
                if (!string.IsNullOrWhiteSpace(narrative.Recommendations))
                {
                    sheet.Cell(rowIndex++, 1).Value = "Recommendations";
                    sheet.Cell(rowIndex++, 1).Value = narrative.Recommendations;
                }
                rowIndex++;
            }

            foreach (var line in content.Lines)
            {
                sheet.Cell(rowIndex++, 1).Value = line;
            }

            rowIndex++;
            for (var col = 0; col < content.Headers.Count; col++)
            {
                sheet.Cell(rowIndex, col + 1).Value = content.Headers[col];
            }
            rowIndex++;

            foreach (var row in content.TableRows)
            {
                for (var col = 0; col < row.Count; col++)
                {
                    sheet.Cell(rowIndex, col + 1).Value = row[col];
                }
                rowIndex++;
            }

            workbook.SaveAs(filePath);
        }, cancellationToken);
    }

    private async Task<ReportContent> BuildReportContentAsync(
        Guid tenantId,
        string reportType,
        string? dateFrom,
        string? dateTo,
        CancellationToken cancellationToken)
    {
        return reportType switch
        {
            "TICKET_SUMMARY" => await BuildTicketSummaryAsync(tenantId, dateFrom, dateTo, cancellationToken),
            "SLA_COMPLIANCE" => await BuildSlaComplianceAsync(tenantId, dateFrom, dateTo, cancellationToken),
            "KPI_REPORT" => await BuildKpiReportAsync(tenantId, cancellationToken),
            "ENGINEER_PERF" => await BuildEngineerPerfAsync(tenantId, cancellationToken),
            _ => new ReportContent(["Unknown report type."], [], []),
        };
    }

    private async Task<ReportContent> BuildTicketSummaryAsync(
        Guid tenantId,
        string? dateFrom,
        string? dateTo,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveDateRange(dateFrom, dateTo);
        var rows = await _db.TicketDaily
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId && r.Date >= from && r.Date <= to)
            .OrderBy(r => r.Date)
            .ToListAsync(cancellationToken);

        var totals = rows.Aggregate(
            new { Created = 0, Resolved = 0, Escalated = 0, Breaches = 0 },
            (acc, r) => new
            {
                Created = acc.Created + r.TotalCreated,
                Resolved = acc.Resolved + r.TotalResolved,
                Escalated = acc.Escalated + r.TotalEscalated,
                Breaches = acc.Breaches + r.SlaBreachCount,
            });

        var slaRate = totals.Created > 0
            ? ((totals.Created - totals.Breaches) / (decimal)totals.Created * 100m).ToString("F1")
            : "100.0";

        var lines = new List<string>
        {
            $"Period: {from:yyyy-MM-dd} to {to:yyyy-MM-dd}",
            $"Total Tickets Created: {totals.Created}",
            $"Total Tickets Resolved: {totals.Resolved}",
            $"Total Escalated: {totals.Escalated}",
            $"SLA Breaches: {totals.Breaches}",
            $"SLA Compliance Rate: {slaRate}%",
            "Daily Breakdown",
        };

        var tableRows = new List<IReadOnlyList<string>>();
        foreach (var r in rows.Take(20))
        {
            lines.Add($"{r.Date:yyyy-MM-dd}  |  Created: {r.TotalCreated}  Resolved: {r.TotalResolved}  Breaches: {r.SlaBreachCount}");
            tableRows.Add([
                r.Date.ToString("yyyy-MM-dd"),
                r.TotalCreated.ToString(),
                r.TotalResolved.ToString(),
                r.TotalEscalated.ToString(),
                r.TotalOpen.ToString(),
                r.SlaBreachCount.ToString(),
                r.AvgResolutionHours?.ToString("F2") ?? string.Empty,
            ]);
        }

        if (rows.Count > 20)
        {
            lines.Add($"... and {rows.Count - 20} more days.");
        }

        return new ReportContent(
            lines,
            ["Date", "Created", "Resolved", "Escalated", "Open", "SLA Breaches", "Avg Resolution (hrs)"],
            tableRows);
    }

    private async Task<ReportContent> BuildSlaComplianceAsync(
        Guid tenantId,
        string? dateFrom,
        string? dateTo,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveDateRange(dateFrom, dateTo);
        var rows = await _db.SlaDaily
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId && r.Date >= from && r.Date <= to)
            .OrderBy(r => r.Date)
            .ToListAsync(cancellationToken);

        var avgCompliance = rows.Count > 0
            ? rows.Average(r => (double)(r.CompliancePct ?? 100m)).ToString("F1")
            : "100.0";

        var lines = new List<string>
        {
            $"Period: {from:yyyy-MM-dd} to {to:yyyy-MM-dd}",
            $"Average SLA Compliance: {avgCompliance}%",
            "Daily SLA Summary",
        };

        var tableRows = new List<IReadOnlyList<string>>();
        foreach (var r in rows.Take(20))
        {
            lines.Add($"{r.Date:yyyy-MM-dd}  |  Compliance: {r.CompliancePct}%  Breaches: {r.ResolutionBreaches}  Total: {r.TotalTickets}");
            tableRows.Add([
                r.Date.ToString("yyyy-MM-dd"),
                r.TotalTickets.ToString(),
                r.PickupBreaches.ToString(),
                r.ResolutionBreaches.ToString(),
                r.CompliancePct?.ToString("F2") ?? string.Empty,
            ]);
        }

        return new ReportContent(
            lines,
            ["Date", "Total Tickets", "Pickup Breaches", "Resolution Breaches", "Compliance %"],
            tableRows);
    }

    private async Task<ReportContent> BuildKpiReportAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var rows = await _db.KpiSummary
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.UpdatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var lines = new List<string> { "KPI Performance Summary", "Latest KPI Scores by Engineer + Period" };
        var tableRows = new List<IReadOnlyList<string>>();

        if (rows.Count == 0)
        {
            lines.Add("No KPI data available for this period.");
        }
        else
        {
            foreach (var r in rows.Take(30))
            {
                lines.Add($"Engineer: {r.EngineerId}  |  Period: {r.PeriodKey}  |  Score: {r.OverallScore}");
                tableRows.Add([
                    r.EngineerId.ToString(),
                    r.PeriodKey,
                    r.OverallScore.ToString("F2"),
                    r.UpdatedAt.ToString("O"),
                ]);
            }
        }

        return new ReportContent(
            lines,
            ["Engineer ID", "Period Key", "Overall Score", "Updated At"],
            tableRows);
    }

    private async Task<ReportContent> BuildEngineerPerfAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var rows = await _db.EngineerPerf
            .AsNoTracking()
            .Where(r => r.TenantId == tenantId)
            .OrderByDescending(r => r.UpdatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var lines = new List<string> { "Engineer Performance Report", "Recent Weekly Snapshots" };
        var tableRows = new List<IReadOnlyList<string>>();

        if (rows.Count == 0)
        {
            lines.Add("No performance data available.");
        }
        else
        {
            foreach (var r in rows.Take(30))
            {
                lines.Add($"Week: {r.WeekKey}  |  Engineer: {r.EngineerId}  |  Resolved: {r.TicketsResolved}  Breaches: {r.SlaBreaches}  KPI: {r.KpiScore}");
                tableRows.Add([
                    r.EngineerId.ToString(),
                    r.WeekKey,
                    r.TicketsResolved.ToString(),
                    r.TasksCompleted.ToString(),
                    r.SlaBreaches.ToString(),
                    r.AvgResolutionHours?.ToString("F2") ?? string.Empty,
                    r.KpiScore?.ToString("F2") ?? string.Empty,
                ]);
            }
        }

        return new ReportContent(
            lines,
            ["Engineer ID", "Week", "Tickets Resolved", "Tasks Completed", "SLA Breaches", "Avg Resolution (hrs)", "KPI Score"],
            tableRows);
    }

    private static (DateOnly From, DateOnly To) ResolveDateRange(string? dateFrom, string? dateTo)
    {
        var to = DateOnly.TryParse(dateTo, out var parsedTo)
            ? parsedTo
            : DateOnly.FromDateTime(DateTime.UtcNow);
        var from = DateOnly.TryParse(dateFrom, out var parsedFrom)
            ? parsedFrom
            : to.AddDays(-30);
        return (from, to);
    }

    private static string LabelFor(string reportType) => reportType switch
    {
        "TICKET_SUMMARY" => "Ticket Summary Report",
        "SLA_COMPLIANCE" => "SLA Compliance Report",
        "KPI_REPORT" => "KPI Performance Report",
        "ENGINEER_PERF" => "Engineer Performance Report",
        _ => reportType,
    };

    private sealed record ReportContent(
        IReadOnlyList<string> Lines,
        IReadOnlyList<string> Headers,
        IReadOnlyList<IReadOnlyList<string>> TableRows);
}
