using System.Text;
using ClosedXML.Excel;
using Lotris.Application.Common;
using Lotris.Application.Kpi;

namespace Lotris.Infrastructure.Kpi;

public sealed class ClosedXmlKpiSpreadsheetParser : IKpiSpreadsheetParser
{
    public SpreadsheetParseResult Parse(Stream stream, string fileName)
    {
        var ext = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();
        return ext == "csv" ? ParseCsv(stream) : ParseExcel(stream);
    }

    private static SpreadsheetParseResult ParseExcel(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new BadRequestException("Spreadsheet has no worksheets");

        var headers = new List<string>();
        var rows = new List<IReadOnlyList<string>>();

        var firstRow = sheet.FirstRowUsed();
        var lastRow = sheet.LastRowUsed();
        if (firstRow is null || lastRow is null)
        {
            return new SpreadsheetParseResult(headers, rows);
        }

        var headerRow = firstRow.RowNumber();
        var lastCol = sheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        for (var col = 1; col <= lastCol; col++)
        {
            headers.Add(sheet.Cell(headerRow, col).GetString());
        }

        for (var rowNum = headerRow + 1; rowNum <= lastRow.RowNumber(); rowNum++)
        {
            var cells = new List<string>();
            for (var col = 1; col <= lastCol; col++)
            {
                cells.Add(sheet.Cell(rowNum, col).GetString());
            }

            rows.Add(cells);
        }

        return new SpreadsheetParseResult(headers, rows);
    }

    private static SpreadsheetParseResult ParseCsv(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var headers = new List<string>();
        var rows = new List<IReadOnlyList<string>>();
        var isHeader = true;

        while (reader.ReadLine() is { } line)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var cells = SplitCsvLine(line);
            if (isHeader)
            {
                headers.AddRange(cells);
                isHeader = false;
                continue;
            }

            rows.Add(cells);
        }

        return new SpreadsheetParseResult(headers, rows);
    }

    private static List<string> SplitCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }

            if (c == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(c);
        }

        result.Add(current.ToString());
        return result;
    }
}
