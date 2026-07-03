using Lotris.Application.Onboarding;
using Lotris.Application.Tickets;
using Lotris.Contracts.Onboarding;

namespace Lotris.Application.Onboarding;

public sealed class OnboardingService
{
    private readonly IOnboardingRepository _onboarding;
    private readonly ISlaConfigRepository _slaConfigs;

    public OnboardingService(IOnboardingRepository onboarding, ISlaConfigRepository slaConfigs)
    {
        _onboarding = onboarding;
        _slaConfigs = slaConfigs;
    }

    public async Task<OnboardingStatusDto> GetStatusAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var (completedAt, teamCount) = await _onboarding.GetStatusAsync(tenantId, cancellationToken);
        return new OnboardingStatusDto(
            completedAt.HasValue ? "COMPLETE" : "PENDING",
            completedAt,
            teamCount);
    }

    public Task SaveOrgAsync(Guid tenantId, SaveOnboardingOrgRequest request, CancellationToken cancellationToken = default) =>
        _onboarding.UpdateTenantOrgAsync(tenantId, request.Name.Trim(), request.Slug.Trim(), cancellationToken);

    public Task SaveSlaAsync(
        Guid tenantId,
        SaveOnboardingSlaRequest request,
        CancellationToken cancellationToken = default) =>
        _slaConfigs.UpsertTenantDefaultAsync(
            tenantId,
            request.PickupSlaMinutes,
            request.ResolutionSlaMinutes,
            cancellationToken);

    public async Task<OnboardingActionResponse> SetKpiTemplateAsync(
        Guid tenantId,
        SetOnboardingKpiTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Template.Equals("custom", StringComparison.OrdinalIgnoreCase))
        {
            return new OnboardingActionResponse(true, 0);
        }

        if (!KpiTemplates.TryGetValue(request.Template, out var rows))
        {
            return new OnboardingActionResponse(true, 0);
        }

        await _onboarding.DeleteDraftKpiDefinitionsAsync(tenantId, cancellationToken);
        foreach (var row in rows)
        {
            await _onboarding.InsertKpiDefinitionAsync(
                tenantId,
                row.Name,
                row.Description,
                row.MetricType,
                row.Direction,
                row.Scope,
                row.DefaultTarget,
                row.Weight,
                cancellationToken);
        }

        return new OnboardingActionResponse(true, rows.Count);
    }

    public async Task<OnboardingActionResponse> CompleteAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        await _onboarding.CompleteAsync(tenantId, cancellationToken);
        return new OnboardingActionResponse(true);
    }

    private sealed record KpiSeed(
        string Name,
        string Description,
        string MetricType,
        string Direction,
        string Scope,
        string DefaultTarget,
        string Weight);

    private static readonly Dictionary<string, IReadOnlyList<KpiSeed>> KpiTemplates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["response_resolution"] =
        [
            new("Mean Time to First Response", "Average time from ticket open to first engineer response", "TIME_MINUTES", "LOWER_BETTER", "INDIVIDUAL", "30", "35"),
            new("Mean Time to Resolution", "Average time from ticket open to resolution", "TIME_HOURS", "LOWER_BETTER", "INDIVIDUAL", "4", "35"),
            new("SLA Compliance Rate", "Percentage of tickets resolved within SLA", "PERCENTAGE", "HIGHER_BETTER", "TEAM", "95", "30"),
        ],
        ["csat"] =
        [
            new("Customer Satisfaction Score", "Average CSAT score from post-resolution surveys", "SCORE", "HIGHER_BETTER", "INDIVIDUAL", "4.5", "40"),
            new("Net Promoter Score", "NPS from periodic tenant surveys", "SCORE", "HIGHER_BETTER", "ORG", "50", "30"),
            new("Reopen Rate", "Percentage of tickets reopened after resolution", "PERCENTAGE", "LOWER_BETTER", "INDIVIDUAL", "5", "30"),
        ],
        ["balanced"] =
        [
            new("Mean Time to First Response", "Average time from ticket open to first engineer response", "TIME_MINUTES", "LOWER_BETTER", "INDIVIDUAL", "30", "25"),
            new("SLA Compliance Rate", "Percentage of tickets resolved within SLA", "PERCENTAGE", "HIGHER_BETTER", "TEAM", "95", "25"),
            new("Customer Satisfaction Score", "Average CSAT score from post-resolution surveys", "SCORE", "HIGHER_BETTER", "INDIVIDUAL", "4.2", "25"),
            new("Tickets Resolved per Day", "Average number of tickets closed per engineer per day", "COUNT", "HIGHER_BETTER", "INDIVIDUAL", "8", "25"),
        ],
    };
}
