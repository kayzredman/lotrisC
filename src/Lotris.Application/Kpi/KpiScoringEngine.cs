namespace Lotris.Application.Kpi;

public sealed record ScoringMetricInput(decimal Weight, decimal ActualScore, decimal TargetScore);

public sealed record ScoringAreaInput(
    Guid AreaId,
    string AreaName,
    decimal Weight,
    IReadOnlyList<ScoringMetricInput> Metrics);

public sealed record ScoringResult(
    decimal OverallScore,
    IReadOnlyList<AreaScoreResult> AreaScores);

public sealed record AreaScoreResult(
    Guid AreaId,
    string AreaName,
    decimal Score,
    decimal Weight);

public static class KpiScoringEngine
{
    public static ScoringResult Compute(IReadOnlyList<ScoringAreaInput> areas)
    {
        var areaScores = new List<AreaScoreResult>();
        var overallScore = 0m;

        foreach (var area in areas)
        {
            var totalMetricWeight = area.Metrics.Sum(m => m.Weight);
            var areaScore = 0m;

            if (totalMetricWeight > 0)
            {
                foreach (var metric in area.Metrics)
                {
                    var metricScore = metric.TargetScore > 0
                        ? Math.Min(metric.ActualScore / metric.TargetScore * 100m, 100m)
                        : 0m;
                    areaScore += metricScore * (metric.Weight / totalMetricWeight);
                }
            }

            var roundedAreaScore = Math.Round(areaScore, 2, MidpointRounding.AwayFromZero);
            areaScores.Add(new AreaScoreResult(area.AreaId, area.AreaName, roundedAreaScore, area.Weight));
            overallScore += areaScore * (area.Weight / 100m);
        }

        overallScore = Math.Round(overallScore, 2, MidpointRounding.AwayFromZero);
        return new ScoringResult(overallScore, areaScores);
    }
}
