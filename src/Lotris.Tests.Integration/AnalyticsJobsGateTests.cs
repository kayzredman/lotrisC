using System.Net;
using System.Net.Http.Json;
using Lotris.Application.Analytics;
using Lotris.Contracts.Analytics;
using Lotris.Domain;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Lotris.Tests.Integration;

public sealed class AnalyticsJobsGateTests : IClassFixture<LotrisWebApplicationFactory>, IAsyncLifetime
{
    private readonly LotrisWebApplicationFactory _factory;

    public AnalyticsJobsGateTests(LotrisWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IAnalyticsJobConfigRepository>()
            .EnsurePlatformDefaultAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetConfig_AsAdmin_Returns200()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var response = await client.GetAsync("/api/v1/admin/analytics-jobs/config");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AnalyticsJobConfigDto>();
        Assert.NotNull(body);
        Assert.True(body.IncrementalRollupIntervalMinutes >= 2);
    }

    [Fact]
    public async Task GetConfig_AsEngineer_Returns403()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Engineer);
        var response = await client.GetAsync("/api/v1/admin/analytics-jobs/config");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PatchConfig_RejectsIntervalBelowMinimum()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var response = await client.PatchAsJsonAsync(
            "/api/v1/admin/analytics-jobs/config",
            new PatchAnalyticsJobConfigRequest(IncrementalRollupIntervalMinutes: 1));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RunNow_EnforcesCooldown()
    {
        var client = _factory.CreateAuthenticatedClient(UserRole.Admin);
        var first = await client.PostAsync(
            $"/api/v1/admin/analytics-jobs/{AnalyticsJobKeys.SlaPredictorScan}/run-now",
            null);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsync(
            $"/api/v1/admin/analytics-jobs/{AnalyticsJobKeys.SlaPredictorScan}/run-now",
            null);
        Assert.Equal(HttpStatusCode.TooManyRequests, second.StatusCode);
    }
}
