namespace Lotris.Application.Common;

public sealed class LotrisDeploymentOptions
{
    public const string SectionName = "Lotris";

    /// <summary>Cloud (default) or OnPrem — on-prem unlocks all intelligence features with no payment gates.</summary>
    public string DeploymentMode { get; init; } = "Cloud";

    /// <summary>When true, skip feature flags and monthly query quotas (recommended for on-prem).</summary>
    public bool DisablePaymentGates { get; init; }

    public bool AllFeaturesUnlocked =>
        DisablePaymentGates ||
        string.Equals(DeploymentMode, "OnPrem", StringComparison.OrdinalIgnoreCase);
}
