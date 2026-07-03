using Lotris.Application.Kpi;
using Xunit;

namespace Lotris.Tests.Integration;

public class KpiScoringEngineTests
{
    [Fact]
    public void Compute_WeightedMetricsAndAreas_ReturnsExpectedOverallScore()
    {
        var areas = new[]
        {
            new ScoringAreaInput(
                Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                "Performance",
                60m,
                [
                    new ScoringMetricInput(50m, 80m, 100m),
                    new ScoringMetricInput(50m, 50m, 50m),
                ]),
            new ScoringAreaInput(
                Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                "Quality",
                40m,
                [
                    new ScoringMetricInput(100m, 90m, 100m),
                ]),
        };

        var result = KpiScoringEngine.Compute(areas);

        Assert.Equal(90m, result.OverallScore);
        Assert.Equal(2, result.AreaScores.Count);
        Assert.Equal(90m, result.AreaScores[0].Score);
        Assert.Equal(90m, result.AreaScores[1].Score);
    }

    [Fact]
    public void Compute_CapsMetricScoreAt100()
    {
        var areas = new[]
        {
            new ScoringAreaInput(
                Guid.NewGuid(),
                "Overachievement",
                100m,
                [
                    new ScoringMetricInput(100m, 150m, 100m),
                ]),
        };

        var result = KpiScoringEngine.Compute(areas);

        Assert.Equal(100m, result.OverallScore);
    }

    [Fact]
    public void Compute_ZeroTargetMetric_ContributesZero()
    {
        var areas = new[]
        {
            new ScoringAreaInput(
                Guid.NewGuid(),
                "Empty",
                100m,
                [
                    new ScoringMetricInput(100m, 50m, 0m),
                ]),
        };

        var result = KpiScoringEngine.Compute(areas);

        Assert.Equal(0m, result.OverallScore);
    }

    [Fact]
    public void Compute_NoMetrics_ReturnsZeroOverall()
    {
        var areas = new[]
        {
            new ScoringAreaInput(Guid.NewGuid(), "No metrics", 100m, []),
        };

        var result = KpiScoringEngine.Compute(areas);

        Assert.Equal(0m, result.OverallScore);
        Assert.Equal(0m, result.AreaScores[0].Score);
    }
}
