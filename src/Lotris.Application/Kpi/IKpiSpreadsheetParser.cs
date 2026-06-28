namespace Lotris.Application.Kpi;

public interface IKpiSpreadsheetParser
{
    SpreadsheetParseResult Parse(Stream stream, string fileName);
}

public sealed record SpreadsheetParseResult(
    IReadOnlyList<string> Headers,
    IReadOnlyList<IReadOnlyList<string>> Rows);
