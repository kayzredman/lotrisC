using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Lotris.Api.OpenApi;

/// <summary>
/// Adds API metadata and JWT Bearer security scheme for Scalar / OpenAPI clients.
/// </summary>
public sealed class LotrisOpenApiDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Info = new OpenApiInfo
        {
            Title = "Lotris API",
            Version = "v1",
            Description =
                "REST API for the Lotris IT Help Desk (ASP.NET Core). " +
                "Authenticate with POST /api/v1/auth/login, then send `Authorization: Bearer {token}` on protected routes. " +
                "Human-readable index: docs/API.md in the repo.",
        };

        var components = document.Components ??= new OpenApiComponents();
        components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Lotris JWT access token",
        };

        return Task.CompletedTask;
    }
}
