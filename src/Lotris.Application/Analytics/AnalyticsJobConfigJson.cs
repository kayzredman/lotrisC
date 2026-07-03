using System.Text.Json;

namespace Lotris.Application.Analytics;

public static class AnalyticsJobConfigJson
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static IReadOnlyList<string> ParseBatchTimes(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? ["08:00", "18:00"];
        }
        catch
        {
            return ["08:00", "18:00"];
        }
    }

    public static string SerializeBatchTimes(IReadOnlyList<string> times) =>
        JsonSerializer.Serialize(times, JsonOptions);
}
