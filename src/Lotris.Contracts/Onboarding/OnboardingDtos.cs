namespace Lotris.Contracts.Onboarding;

public sealed record OnboardingStatusDto(
    string Status,
    DateTime? CompletedAt,
    int TeamCount);

public sealed record SaveOnboardingOrgRequest(string Name, string Slug);

public sealed record SaveOnboardingSlaRequest(int PickupSlaMinutes, int ResolutionSlaMinutes);

public sealed record SetOnboardingKpiTemplateRequest(string Template);

public sealed record OnboardingActionResponse(bool Ok, int Created = 0);
