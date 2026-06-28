using Lotris.Application.Common;
using Lotris.Contracts;
using Lotris.Contracts.Kpi;
using System.Globalization;

namespace Lotris.Application.Kpi;

public sealed class KpiImportService
{
    private readonly KpiService _kpi;
    private readonly IKpiRepository _repository;
    private readonly IKpiImportPendingStore _pending;
    private readonly IKpiSpreadsheetParser _parser;

    public KpiImportService(
        KpiService kpi,
        IKpiRepository repository,
        IKpiImportPendingStore pending,
        IKpiSpreadsheetParser parser)
    {
        _kpi = kpi;
        _repository = repository;
        _pending = pending;
        _parser = parser;
    }

    public async Task<KpiUploadPreviewResponse> ParseUploadAsync(
        LotrisSession session,
        Guid agreementId,
        Stream fileStream,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        await _kpi.RequireAgreementForImportAsync(session, agreementId, cancellationToken);

        var ext = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        if (ext is not ("xlsx" or "xls" or "csv"))
        {
            throw new BadRequestException("Only .xlsx, .xls, or .csv files are accepted");
        }

        var table = _parser.Parse(fileStream, fileName);

        if (table.Headers.Count == 0)
        {
            throw new BadRequestException("Spreadsheet has no worksheets or headers");
        }

        var allRows = new List<KpiPendingImportRow>();
        for (var i = 0; i < table.Rows.Count; i++)
        {
            var cells = table.Rows[i].ToList();
            allRows.Add(new KpiPendingImportRow
            {
                Description = GetCell(cells, 0),
                Weight = ParseDecimal(GetCell(cells, 1)),
                TargetScore = ParseDecimal(GetCell(cells, 2)),
                MeasurementPeriod = "MONTHLY",
            });
        }

        _pending.Set(agreementId, allRows);

        var sampleRows = table.Rows.Take(5).Select(row =>
        {
            var dict = new Dictionary<string, string>();
            for (var i = 0; i < table.Headers.Count; i++)
            {
                var header = table.Headers[i];
                dict[header] = i < row.Count ? row[i] : string.Empty;
            }

            return dict;
        }).ToList();

        return new KpiUploadPreviewResponse(table.Headers, sampleRows, allRows.Count);
    }

    public async Task<KpiImportResultResponse> ImportWithMappingAsync(
        LotrisSession session,
        Guid agreementId,
        ImportColumnMappingRequest request,
        CancellationToken cancellationToken = default)
    {
        var agreement = await _kpi.RequireAgreementForImportAsync(session, agreementId, cancellationToken);
        if (agreement.Status != "DRAFT")
        {
            throw new BadRequestException("Can only import into DRAFT agreements");
        }

        var rows = _pending.Get(agreementId);
        if (rows is null || rows.Count == 0)
        {
            throw new BadRequestException("No pending upload found. Upload a file first.");
        }

        var mappedRows = rows.Select(row => new KpiPendingImportRow
        {
            Description = row.Description,
            Weight = row.Weight,
            TargetScore = row.TargetScore,
            MeasurementPeriod = row.MeasurementPeriod,
            KpiDefinitionId = row.KpiDefinitionId,
        }).ToList();

        var existingArea = await _repository.GetFirstAgreementAreaAsync(agreementId, cancellationToken);
        Guid areaId;
        if (existingArea is not null)
        {
            areaId = existingArea.Id;
        }
        else
        {
            areaId = Guid.NewGuid();
            await _repository.CreateAgreementAreaAsync(new KpiAgreementAreaEntity
            {
                Id = areaId,
                TenantId = agreement.TenantId,
                AgreementId = agreementId,
                Name = "Imported Metrics",
                Weight = 100m,
                SortOrder = 0,
            }, cancellationToken);
        }

        var imported = 0;
        for (var i = 0; i < mappedRows.Count; i++)
        {
            var row = mappedRows[i];
            if (string.IsNullOrWhiteSpace(row.Description) || row.TargetScore <= 0)
            {
                continue;
            }

            await _repository.CreateAgreementMetricAsync(new KpiAgreementMetricEntity
            {
                Id = Guid.NewGuid(),
                TenantId = agreement.TenantId,
                AreaId = areaId,
                KpiDefinitionId = row.KpiDefinitionId,
                Description = row.Description,
                MeasurementPeriod = row.MeasurementPeriod,
                Weight = row.Weight,
                TargetScore = row.TargetScore,
                ActualScore = null,
                SortOrder = i,
            }, cancellationToken);
            imported++;
        }

        _pending.Remove(agreementId);
        return new KpiImportResultResponse(imported);
    }

    private static string GetCell(IReadOnlyList<string> cells, int index) =>
        index < cells.Count ? cells[index] : string.Empty;

    private static decimal ParseDecimal(string value) =>
        decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0m;
}
