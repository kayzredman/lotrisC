namespace Lotris.Api.OpenApi;

public sealed class OpenApiHostingOptions
{
    public const string SectionName = "OpenApi";

    /// <summary>Serve /openapi/v1.json (default: true except Testing environment).</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Serve Scalar UI at /openapi (default: same as Enabled).</summary>
    public bool UiEnabled { get; set; } = true;
}
